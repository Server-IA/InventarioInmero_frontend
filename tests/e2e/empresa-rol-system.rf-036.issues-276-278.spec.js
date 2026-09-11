import { test, expect, request as playwrightRequest } from '@playwright/test';
import {
  loginAsSystemAdmin,
  loginAsAdminGetToken,
  loginApiGetToken,
  openModuleScreen,
  clickActionButton,
  getActiveDialog,
  authHeaders,
  BACKEND_URI,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  findGridCellInColumnAcrossPages,
} from './helpers/e2e.shared.utils';

const TARGET_EMPRESA_ID = 1505;

// Roles base del sistema: nunca deben eliminarse desde un test de QA.
const PROTECTED_ROLE_IDS = new Set([1, 2]);

// Recursos temporales creados por los escenarios. Se registran en el momento de la
// creación (no al final) para que un timeout no deje datos sin cleanup.
const createdResources = [];

// El nombre de rol del dominio solo admite letras mayúsculas y UNA sola barra baja
// (`^[A-Z]+(?:_[A-Z]+)?$`), por lo que el sufijo único se genera con letras.
function buildUniqueRoleName() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let suffix = '';
  for (let index = 0; index < 10; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `ROLE_QA${suffix}`;
}

function unwrap(data) {
  return Array.isArray(data) ? data : data?.content ?? [];
}

async function getAdminToken(request) {
  return loginAsAdminGetToken(request);
}

function registerRoleResource(role, issue) {
  const entry = { issue, roleId: role.id, nombre: role.nombre, relationId: null, empresaId: null };
  createdResources.push(entry);
  return entry;
}

async function createRoleByApi(request, issue) {
  const token = await getAdminToken(request);
  const nombre = buildUniqueRoleName();
  const response = await request.post(`${BACKEND_URI}/api/v1/roles`, {
    headers: authHeaders(token),
    data: { nombre, descripcion: `Rol temporal E2E issue #${issue}`, estadoId: 1 },
  });
  expect([200, 201], `No fue posible crear el rol temporal ${nombre}`).toContain(response.status());

  const catalogResponse = await request.get(`${BACKEND_URI}/api/v1/items/rol/0`, {
    headers: authHeaders(token),
  });
  expect(catalogResponse.ok(), 'No fue posible consultar el catálogo de roles').toBeTruthy();
  const role = unwrap(await catalogResponse.json()).find(
    (item) => (item.name ?? item.nombre ?? item.rolNombre) === nombre
  );
  expect(role?.id, `No se resolvió el id del rol temporal ${nombre}`).toBeTruthy();

  const created = { id: Number(role.id), nombre, token };
  registerRoleResource(created, issue);
  return created;
}

function relationIdFromLocation(response) {
  const location = response.headers()['location'];
  const match = location?.match(/\/empresa-rol\/(\d+)$/);
  expect(match?.[1], 'La creación Empresa-Rol no devolvió un Location con ID para cleanup seguro').toBeTruthy();
  return Number(match[1]);
}

async function createEmpresaRolByApi(request, token, rolId, empresaId, resource) {
  const response = await request.post(`${BACKEND_URI}/api/v1/system/empresa-rol`, {
    headers: authHeaders(token),
    data: { empresaId, rolId },
  });
  expect([200, 201, 204], `No fue posible crear Empresa-Rol para empresa ${empresaId}`).toContain(
    response.status()
  );
  const relationId = relationIdFromLocation(response);
  if (resource) {
    resource.relationId = relationId;
    resource.empresaId = empresaId;
  }
  return relationId;
}

async function firstAvailablePermission(request, token) {
  const subsystemsResponse = await request.get(`${BACKEND_URI}/api/v1/sub-sistemas?campos=id,nombre`, {
    headers: authHeaders(token),
  });
  expect(subsystemsResponse.ok(), 'No fue posible consultar subsistemas').toBeTruthy();

  for (const subsystem of unwrap(await subsystemsResponse.json())) {
    const modulesResponse = await request.get(
      `${BACKEND_URI}/api/v1/empresa-rol-permisos/modulos-subsistema?subsistemaIds=${subsystem.id}`,
      { headers: authHeaders(token) }
    );
    if (!modulesResponse.ok()) continue;

    const module = unwrap(await modulesResponse.json()).find((item) =>
      (item.permisos ?? []).some((permission) => permission?.id != null)
    );
    const permission = module?.permisos?.find((item) => item?.id != null);
    if (permission) {
      return {
        permission,
        subsystemName: subsystem.nombre ?? subsystem.name,
        moduleName: module.moduloNombre ?? module.nombre ?? module.name,
      };
    }
  }

  throw new Error('No hay permisos disponibles para preparar el escenario E2E');
}

async function assignPermissionByApi(request, token, rolId, empresaId, permisoId) {
  const response = await request.post(
    `${BACKEND_URI}/api/v1/empresa-rol-permisos/rol/${rolId}/permisos?empresaId=${empresaId}`,
    {
      headers: authHeaders(token),
      data: { permisosId: [permisoId] },
    }
  );
  expect([200, 201, 204], `No fue posible preparar el permiso ${permisoId}`).toContain(response.status());
}

async function getPermissionsByApi(request, token, rolId, empresaId) {
  const response = await request.get(
    `${BACKEND_URI}/api/v1/empresa-rol-permisos/rol/${rolId}/permisos?empresaId=${empresaId}`,
    { headers: authHeaders(token) }
  );
  expect(response.ok(), 'No fue posible consultar permisos después de la operación').toBeTruthy();
  return unwrap(await response.json());
}

async function waitForEmpresaRolGridReady(page) {
  const rows = page.locator('[role="row"][data-id]');
  const footer = page.locator('.MuiDataGrid-footerContainer').first();

  await expect(rows.first(), 'La grilla Empresa-Rol no renderizó ninguna fila').toBeVisible({ timeout: 30000 });
  await expect
    .poll(
      async () => ((await footer.textContent()) ?? '').replace(/\s+/g, ' ').trim(),
      { timeout: 30000, message: 'La paginación Empresa-Rol quedó en estado transitorio 0–0 of 0' }
    )
    .toMatch(/(?:of|de)\s+[1-9]\d*/i);
}

// El formulario agrupa subsistema > módulo > permisos en acordeones anidados que
// DESMONTAN su contenido al colapsar, y el mismo nombre de subsistema aparece dos veces
// (con y sin permisos). Por eso se expanden solo los summaries VISIBLES y colapsados,
// filtrando por estado accesible (`expanded: false` excluye nodos ocultos) y
// re-resolviendo el locator en cada intento (el árbol se remonta al recargar módulos).
async function expandPermissionPath(dialog, subsystemName, moduleName, permissionName) {
  const permissionText = dialog.getByText(permissionName, { exact: true });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (await permissionText.isVisible().catch(() => false)) break;

    const pending = await dialog.getByRole('button', { expanded: false }).count();
    if (pending === 0) {
      await dialog.page().waitForTimeout(400);
      continue;
    }

    for (let index = 0; index < pending; index += 1) {
      const candidate = dialog.getByRole('button', { expanded: false }).first();
      if ((await candidate.count()) === 0) break;
      await candidate.click({ timeout: 10000 }).catch(() => {});
      await dialog.page().waitForTimeout(250);
      if (await permissionText.isVisible().catch(() => false)) break;
    }
  }

  await expect(
    permissionText,
    `No se encontró el permiso "${permissionName}" tras expandir "${subsystemName}" > "${moduleName}"`
  ).toBeVisible({ timeout: 20000 });

  return permissionText.locator(
    'xpath=ancestor::div[contains(@class,"MuiBox-root")][.//button[normalize-space()="Quitar"]][1]'
  );
}

async function getRowByRoleName(page, roleName) {
  await waitForEmpresaRolGridReady(page);
  const cell = await findGridCellInColumnAcrossPages(page, 'Rol', roleName, {
    timeout: 20000,
    maxPages: 80,
  });
  return cell.locator('xpath=ancestor::*[@role="row" and @data-id]').first();
}

async function openSystemForm(page) {
  await clickActionButton(page, 'AGREGAR');
  const dialog = await getActiveDialog(page);
  await expect(dialog.getByText(/Crear Rol y Asignar Permisos/i)).toBeVisible();
  return dialog;
}

async function selectMuiOption(dialog, index, optionText) {
  const select = dialog.getByRole('combobox').nth(index);
  await expect(select).toBeVisible();
  await select.click();
  await dialog.page().getByRole('option', { name: optionText, exact: true }).click();
  await expect(select).toContainText(optionText);
}

// Teardown en afterAll con un APIRequestContext propio: el fixture `request` del caso
// se cierra cuando el test agota su timeout y el cleanup del `finally` ya no puede correr.
// Regla de seguridad: si la relación Empresa-Rol no pudo eliminarse, NO se elimina el rol
// (dejar un rol soft-deleted con relación activa rompe el listado con 500).
test.afterAll(async () => {
  if (createdResources.length === 0) return;

  const api = await playwrightRequest.newContext();
  const failures = [];
  const cleaned = [];

  try {
    const token = await loginApiGetToken(api, ADMIN_EMAIL, ADMIN_PASSWORD);

    for (const resource of createdResources) {
      const label = `rol ${resource.roleId} (${resource.nombre})`;

      if (PROTECTED_ROLE_IDS.has(resource.roleId)) {
        failures.push(`${label}: es un rol protegido, no se toca`);
        continue;
      }

      let relationRemoved = resource.relationId == null;

      if (resource.relationId != null) {
        try {
          const permissionsResponse = await api.get(
            `${BACKEND_URI}/api/v1/empresa-rol-permisos/rol/${resource.roleId}/permisos?empresaId=${resource.empresaId}`,
            { headers: authHeaders(token) }
          );
          if (permissionsResponse.ok()) {
            const permissionIds = unwrap(await permissionsResponse.json()).map((permission) => permission.id);
            if (permissionIds.length > 0) {
              const deletePermissions = await api.delete(
                `${BACKEND_URI}/api/v1/empresa-rol-permisos/rol/${resource.roleId}/permisos/quitar?empresaId=${resource.empresaId}`,
                { headers: authHeaders(token), data: { permisosId: permissionIds } }
              );
              if (![200, 202, 204].includes(deletePermissions.status())) {
                failures.push(`${label}: retirar permisos devolvió HTTP ${deletePermissions.status()}`);
              }
            }
          } else {
            failures.push(`${label}: consultar permisos devolvió HTTP ${permissionsResponse.status()}`);
          }

          const deleteRelation = await api.delete(
            `${BACKEND_URI}/api/v1/system/empresa-rol/${resource.relationId}`,
            { headers: authHeaders(token) }
          );
          relationRemoved = [200, 204, 404].includes(deleteRelation.status());
          if (!relationRemoved) {
            failures.push(`${label}: eliminar relación ${resource.relationId} devolvió HTTP ${deleteRelation.status()}`);
          }
        } catch (error) {
          failures.push(`${label}: error al limpiar relación ${resource.relationId}: ${error.message}`);
        }
      }

      if (!relationRemoved) {
        failures.push(`${label}: se conserva el rol porque su relación Empresa-Rol sigue activa`);
        continue;
      }

      try {
        const deleteRole = await api.delete(`${BACKEND_URI}/api/v1/roles/${resource.roleId}`, {
          headers: authHeaders(token),
        });
        if ([200, 202, 204, 404].includes(deleteRole.status())) {
          cleaned.push(resource.roleId);
        } else {
          failures.push(`${label}: eliminar rol devolvió HTTP ${deleteRole.status()}`);
        }
      } catch (error) {
        failures.push(`${label}: error al eliminar rol: ${error.message}`);
      }
    }
  } catch (error) {
    failures.push(`no fue posible autenticar para el cleanup: ${error.message}`);
  } finally {
    await api.dispose();
  }

  console.log(`[cleanup QA] roles eliminados: ${cleaned.length > 0 ? cleaned.join(', ') : 'ninguno'}`);
  if (failures.length > 0) {
    console.error(
      `[cleanup QA] RESIDUOS PENDIENTES:\n- ${failures.join('\n- ')}\nRecursos: ${JSON.stringify(createdResources)}`
    );
  }
});

test.describe('Empresa-Rol - cobertura E2E issues #276, #277 y #278', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  test('#277: admin sistema crea la relación en la empresa elegida, no en el contexto inicial', async ({ page, request }) => {
    const role = await createRoleByApi(request, 277);
    const resource = createdResources.find((item) => item.roleId === role.id);

    await loginAsSystemAdmin(page, request, 'EmpresaRol');
    await openModuleScreen(page, 'EmpresaRol', /Roles de Empresa/i);

    const initialEmpresaId = await page.evaluate(() => Number(localStorage.getItem('empresaId')));
    const companiesResponse = await request.get(`${BACKEND_URI}/api/v1/items/empresa/0`, {
      headers: authHeaders(role.token),
    });
    expect(companiesResponse.ok(), 'No fue posible consultar empresas activas').toBeTruthy();
    const targetCompany = unwrap(await companiesResponse.json()).find(
      (company) => Number(company.id) !== initialEmpresaId
    );
    expect(targetCompany, `No hay empresa objetivo distinta del contexto inicial (${initialEmpresaId})`).toBeTruthy();
    const targetEmpresaId = Number(targetCompany.id);

    const dialog = await openSystemForm(page);
    await selectMuiOption(dialog, 0, role.nombre);
    await selectMuiOption(dialog, 1, targetCompany.nombre ?? targetCompany.name);

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/system/empresa-rol') && response.request().method() === 'POST'
    );
    await dialog.getByRole('button', { name: /^Guardar$/i }).click();
    const response = await responsePromise;
    const relationId = relationIdFromLocation(response);
    resource.relationId = relationId;
    resource.empresaId = targetEmpresaId;

    expect([200, 201, 204]).toContain(response.status());
    expect(response.request().postDataJSON()).toMatchObject({
      empresaId: targetEmpresaId,
      rolId: role.id,
    });
  });

  test('#278: admin sistema retira un permiso de la empresa objetivo y conserva el aislamiento tenant', async ({ page, request }) => {
    const role = await createRoleByApi(request, 278);
    const resource = createdResources.find((item) => item.roleId === role.id);

    await createEmpresaRolByApi(request, role.token, role.id, TARGET_EMPRESA_ID, resource);
    const { permission, subsystemName, moduleName } = await firstAvailablePermission(request, role.token);
    expect(subsystemName, 'El permiso temporal no tiene subsistema navegable').toBeTruthy();
    expect(moduleName, 'El permiso temporal no tiene módulo navegable').toBeTruthy();
    await assignPermissionByApi(request, role.token, role.id, TARGET_EMPRESA_ID, permission.id);

    await loginAsSystemAdmin(page, request, 'EmpresaRol');
    await openModuleScreen(page, 'EmpresaRol', /Roles de Empresa/i);
    const row = await getRowByRoleName(page, role.nombre);
    await row.click();
    await clickActionButton(page, 'ACTUALIZAR');
    const dialog = await getActiveDialog(page);

    await expect(dialog.getByText(/Editar Rol y Permisos/i)).toBeVisible();
    const permissionCard = await expandPermissionPath(dialog, subsystemName, moduleName, permission.nombre);
    const removeButton = permissionCard.getByRole('button', { name: /^Quitar$/i });
    await expect(removeButton).toBeVisible();

    const deleteResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname.endsWith(`/api/v1/empresa-rol-permisos/rol/${role.id}/permisos/quitar`) &&
        url.searchParams.get('empresaId') === String(TARGET_EMPRESA_ID) &&
        response.request().method() === 'DELETE'
      );
    });
    await removeButton.click();
    const deleteResponse = await deleteResponsePromise;
    expect([200, 202, 204]).toContain(deleteResponse.status());

    const remainingPermissions = await getPermissionsByApi(request, role.token, role.id, TARGET_EMPRESA_ID);
    expect(remainingPermissions.map((item) => Number(item.id))).not.toContain(Number(permission.id));
  });

  test('#276: falla puntual al consultar permisos muestra reintento y la recarga posterior recupera la fila', async ({ page, request }) => {
    await loginAsSystemAdmin(page, request, 'EmpresaRol');
    await openModuleScreen(page, 'EmpresaRol', /Roles de Empresa/i);
    await waitForEmpresaRolGridReady(page);

    const visibleRoleCell = page.locator('[role="row"][data-id] [role="cell"][aria-colindex="3"]').first();
    await expect(visibleRoleCell, 'No hay una fila visible para preparar #276').toBeVisible({ timeout: 20000 });
    const visibleRoleName = ((await visibleRoleCell.textContent()) ?? '').trim();
    expect(visibleRoleName, 'La primera fila visible no contiene un nombre de rol').toBeTruthy();

    // Se interrumpen TODAS las consultas de permisos: el componente hace una petición por
    // cada relación Empresa-Rol, por lo que no se depende de resolver un rolId concreto.
    let blockPermissions = true;
    const routePattern = '**/api/v1/empresa-rol-permisos/**';
    try {
      await page.route(routePattern, async (route) => {
        if (blockPermissions) {
          await route.abort('failed');
          return;
        }
        await route.continue();
      });

      await openModuleScreen(page, 'EmpresaRol', /Roles de Empresa/i);
      await waitForEmpresaRolGridReady(page);

      const row = await getRowByRoleName(page, visibleRoleName);
      await expect(row.getByText(/Error al cargar permisos/i)).toBeVisible({ timeout: 20000 });
      await expect(row.getByRole('button', { name: /^Reintentar$/i })).toBeVisible();
      await expect(page.getByText(/Error al consultar los permisos de uno o más roles/i)).toBeVisible();

      blockPermissions = false;
      await row.getByRole('button', { name: /^Reintentar$/i }).click();
      await expect(row.getByText(/Error al cargar permisos/i)).not.toBeVisible({ timeout: 20000 });
      await expect(row.locator('[role="cell"][aria-colindex="4"]')).not.toHaveText(/Error al cargar permisos/i, { timeout: 20000 });
    } finally {
      await page.unroute(routePattern).catch(() => {});
    }
  });
});
