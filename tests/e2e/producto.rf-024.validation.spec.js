import { test, expect } from '@playwright/test';
import {
  loginAsCompanyAdmin,
  loginAsAdminGetToken,
  authenticateByApi,
  requireEnv,
  switchCompanyRoleFromProfile,
  openModuleScreen,
  clickActionButton,
  getActiveDialog,
  clickDialogButton,
  authHeaders,
  BACKEND_URI,
  NOADMIN_EMAIL,
  NOADMIN_PASSWORD,
} from './helpers/e2e.shared.utils';

async function setGridRowsPerPage(page, size = '50') {
  const footer = page.locator('.MuiDataGrid-footerContainer').first();
  const pageSizeCombo = footer.getByRole('combobox').first();
  if (!(await pageSizeCombo.isVisible().catch(() => false))) return;

  const current = ((await pageSizeCombo.textContent()) || '').trim();
  if (current === String(size)) return;

  await pageSizeCombo.click();
  await page.getByRole('option', { name: new RegExp(`^${size}$`) }).first().click();
  await page.waitForTimeout(250);
}

// Orden de combobox en FormProducto: 0=categoría, 1=estado, 2=unidad mínima.
async function selectComboByIndex(page, dialog, index) {
  await dialog.getByRole('combobox').nth(index).click();
  await page.getByRole('option').first().click();
}

test.describe('RF-024 - Gestión de Productos (validaciones UI)', () => {
  test.beforeEach(async ({ page, request }) => {
    await loginAsCompanyAdmin(page, request, 'producto');
    await switchCompanyRoleFromProfile(page, {
      roleName: 'ROLE_ADMINISTRADOR_EMPRESA',
    });
    await openModuleScreen(page, 'producto', /Producto/i);
    await setGridRowsPerPage(page, '50');
  });

  test('Error autorización: usuario sin permisos no puede gestionar productos', async ({
    page,
    request,
  }) => {
    test.skip(!NOADMIN_EMAIL || !NOADMIN_PASSWORD, 'Configura E2E_NOADMIN_EMAIL y E2E_NOADMIN_PASSWORD (usuario sin permisos).');
    requireEnv('E2E_NOADMIN_EMAIL', NOADMIN_EMAIL);
    requireEnv('E2E_NOADMIN_PASSWORD', NOADMIN_PASSWORD);

    await authenticateByApi(page, request, NOADMIN_EMAIL, NOADMIN_PASSWORD);
    await page.goto('/inventario/');

    await page.evaluate(() => {
      localStorage.setItem('activeModule', 'producto');
    });
    await page.goto('/inventario/');

    const unauthorizedMsg = page.getByText(
      /Error cargando|acceso denegado|forbidden|no autorizado/i
    );
    await expect(unauthorizedMsg.first()).toBeVisible({ timeout: 20000 });
  });

  test('Error autenticación 401: token inválido al guardar producto', async ({ page }) => {
    await clickActionButton(page, 'Crear');
    const dialog = await getActiveDialog(page);

    await dialog.locator('input[name="nombre"]').first().fill(`E2E 401 Test ${Date.now()}`);
    await selectComboByIndex(page, dialog, 0); // categoría
    await selectComboByIndex(page, dialog, 1); // estado
    await selectComboByIndex(page, dialog, 2); // unidad mínima

    // Invalidar token
    await page.evaluate(() => {
      localStorage.setItem('token', 'eyJhbG...oken.xxx');
    });
    await page.waitForTimeout(150);

    const postRequestPromise = page
      .waitForRequest(
        (req) => req.url().includes('/api/v2/productos') && req.method() === 'POST',
        { timeout: 15000 }
      )
      .catch(() => null);

    await clickDialogButton(page, 'Crear');

    const postRequest = await postRequestPromise;
    expect(postRequest, 'No se emitió request POST al guardar con token inválido.').not.toBeNull();

    const postResponse = await postRequest.response();
    if (!postResponse) {
      await expect(
        page
          .getByText(/Error de conexión|Error inesperado|Debe iniciar sesión|inicie sesión/i)
          .first()
      ).toBeVisible({ timeout: 15000 });
      return;
    }

    expect(postResponse.status()).toBe(401);

    await expect(
      page
        .getByText(/Request failed|status code 401|Debe iniciar sesión|No Autenticado|unauthorized/i)
        .first()
    ).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
      localStorage.removeItem('token');
    });
  });
});

test.describe('RF-024 - Gestión de Productos (validaciones backend por API)', () => {
  test('Validación backend: nombre nulo produce 400', async ({ request }) => {
    const token = await loginAsAdminGetToken(request);
    const res = await request.post(`${BACKEND_URI}/api/v2/productos`, {
      headers: authHeaders(token),
      data: {
        nombre: null,
        productoCategoriaId: 1,
        descripcion: '',
        estadoId: 1,
        unidadMinimaId: 1,
        esOrganico: false,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('Validación backend: nombre > 100 caracteres produce 400', async ({ request }) => {
    const token = await loginAsAdminGetToken(request);
    const res = await request.post(`${BACKEND_URI}/api/v2/productos`, {
      headers: authHeaders(token),
      data: {
        nombre: 'A'.repeat(101),
        productoCategoriaId: 1,
        descripcion: '',
        estadoId: 1,
        unidadMinimaId: 1,
        esOrganico: false,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('Error backend: categoría inexistente produce 400', async ({ request }) => {
    const token = await loginAsAdminGetToken(request);
    const res = await request.post(`${BACKEND_URI}/api/v2/productos`, {
      headers: authHeaders(token),
      data: {
        nombre: 'E2E CatInv',
        productoCategoriaId: 999999,
        descripcion: '',
        estadoId: 1,
        unidadMinimaId: 1,
        esOrganico: false,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('Error backend: unidad inexistente produce 400', async ({ request }) => {
    const token = await loginAsAdminGetToken(request);
    const res = await request.post(`${BACKEND_URI}/api/v2/productos`, {
      headers: authHeaders(token),
      data: {
        nombre: 'E2E UnidInv',
        productoCategoriaId: 1,
        descripcion: '',
        estadoId: 1,
        unidadMinimaId: 999999,
        esOrganico: false,
      },
    });
    expect(res.status()).toBe(400);
  });
});
