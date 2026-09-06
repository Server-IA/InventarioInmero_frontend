import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  authenticateByApi,
  requireEnv,
  openModuloScreen,
  selectFirstGridRow,
  fillModuloForm,
  clickDialogSelectFirstOption,
  //findGridCellInColumnAcrossPages,
  clickCreateModuloButton,
  clickDialogButton,
  fillDialogField,
  //clickDialogSelectOption,
  NOADMIN_EMAIL,
  NOADMIN_PASSWORD,
} from './helpers/e2e.shared.utils';

async function waitModuloEditDialogLoaded(page, expectedNameRegex) {
  const dialog = page.locator('[role="dialog"]:visible').last();
  await expect(dialog.getByRole('heading', { name: /Editar Módulo/i })).toBeVisible({ timeout: 15000 });

  // Espera de precarga real: nombre del módulo + combos con valores seleccionados.
  await expect(dialog.locator('input[name="nombre"]').first()).toHaveValue(expectedNameRegex, { timeout: 15000 });
  await expect(dialog.getByRole('combobox', { name: /SubSistema/i }).first()).not.toHaveText(/^\s*$/);
  await expect(dialog.getByRole('combobox', { name: /Tipo Módulo/i }).first()).not.toHaveText(/^\s*$/);
  await expect(dialog.getByRole('combobox', { name: /Tipo Aplicación/i }).first()).not.toHaveText(/^\s*$/);

  return dialog;
}

test.describe('RF-035.0 - Gestión de módulos (validaciones y errores)', () => {
  test.beforeEach(async ({ page, request }) => {
    await loginAsAdmin(page, request);
  });

  test('Validación UI: error cuando faltan campos obligatorios', async ({ page }) => {
    await openModuloScreen(page);

    await clickCreateModuloButton(page);
    await clickDialogButton(page, 'Guardar');

    await expect(page.getByText('El nombre es obligatorio.')).toBeVisible();
  });

  test('Validación UI: longitud máxima de nombre (>100)', async ({ page }) => {
    await openModuloScreen(page);

    await clickCreateModuloButton(page);
    await fillModuloForm(page, {
      nombre: 'A'.repeat(101),
      url: '/e2e-url-larga',
      descripcion: 'Validación de longitud',
      requerido: true,
    });
    await clickDialogButton(page, 'Guardar');

    await expect(page.getByText('El nombre no puede superar 100 caracteres.')).toBeVisible();
  });

  test('Error backend 409: módulo duplicado muestra mensaje esperado', async ({ page }) => {
    const unique = Date.now();
    const nombre = `E2E Duplicado ${unique}`;

    await openModuloScreen(page);

    await clickCreateModuloButton(page);
    await fillModuloForm(page, {
      nombre,
      url: `/e2e-dup-${unique}`,
      descripcion: 'Primera creación para forzar duplicado',
    });
    await clickDialogSelectFirstOption(page, 'subSistemaId');
    await clickDialogButton(page, 'Guardar');
    await expect(page.getByText('Módulo guardado correctamente.')).toBeVisible({ timeout: 15000 });

    await clickCreateModuloButton(page);
    await fillModuloForm(page, {
      nombre,
      url: `/e2e-dup-${unique}`,
      descripcion: 'Segunda creación para validar 409',
    });
    await clickDialogSelectFirstOption(page, 'subSistemaId');

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/v2/modulos') && res.request().method() === 'POST'
    );

    await clickDialogButton(page, 'Guardar');
    const response = await responsePromise;

    expect([400, 409]).toContain(response.status());

    const duplicateMessage = page.getByText(/El módulo ya existe|ya existe|duplicad/i);
    await expect(duplicateMessage.first()).toBeVisible({ timeout: 15000 });
  });

  // test('Error backend 400 RFC9457: inactivar módulo crítico', async ({ page }) => {
  //   await openModuloScreen(page);

  //   let criticalCell;
  //   try {
  //     criticalCell = await findGridCellInColumnAcrossPages(page, 'Nombre', 'Gestión de Módulos', {
  //       maxPages: 80,
  //       timeout: 12000,
  //     });
  //   } catch {
  //     test.skip(true, 'No existe fila "Gestión de Módulos" para validar restricción de módulo crítico.');
  //   }

  //   await criticalCell.click();
  //   await page.getByRole('button', { name: 'Editar' }).click();
  //   await waitModuloEditDialogLoaded(page, /Gestión de Módulos/i);
  //   await clickDialogSelectOption(page, 'estadoId', 'Inactivo');

  //   const putResponsePromise = page.waitForResponse(
  //     (res) => /\/api\/v2\/modulos\/\d+$/.test(res.url()) && res.request().method() === 'PUT'
  //   );

  //   await clickDialogButton(page, 'Guardar');
  //   const putResponse = await putResponsePromise;

  //   if (putResponse.status() === 400) {
  //     const contentType = putResponse.headers()['content-type'] || '';
  //     expect(contentType).toContain('application/problem+json');

  //     const problem = await putResponse.json();
  //     expect(problem.status).toBe(400);
  //     expect(problem.title).toBeTruthy();
  //     expect(problem.detail).toBeTruthy();

  //     await expect(page.getByText(/crítico|No se puede inactivar/i).first()).toBeVisible({ timeout: 15000 });
  //     return;
  //   }

  //   expect([200, 204, 403]).toContain(putResponse.status());
  // });

  test('Error autorización: usuario sin rol administrador no puede gestionar módulos', async ({ page, request }) => {
    test.skip(!NOADMIN_EMAIL || !NOADMIN_PASSWORD, 'Configura E2E_NOADMIN_EMAIL y E2E_NOADMIN_PASSWORD (usuario sin permisos).');
    requireEnv('E2E_NOADMIN_EMAIL', NOADMIN_EMAIL);
    requireEnv('E2E_NOADMIN_PASSWORD', NOADMIN_PASSWORD);

    await authenticateByApi(page, request, NOADMIN_EMAIL, NOADMIN_PASSWORD);
    await page.goto('/inventario/');

    const unauthorizedUiMessage = page.getByText(/Error cargando módulos|acceso denegado|forbidden/i);
    await expect(unauthorizedUiMessage.first()).toBeVisible({ timeout: 20000 });
  });

  test('Error autenticación 401: token inválido al editar', async ({ page }) => {
    await openModuloScreen(page);

    await selectFirstGridRow(page);
    await page.getByRole('button', { name: 'Editar' }).click();

    await waitModuloEditDialogLoaded(page, /.+/);

    await page.evaluate(() => {
      localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvamFjaGlsYUBnbWFpbC5jb20iLCJlbXByZXNhSWQiOjIyNTYsInJvbElkIjoyLCJ0dmVyIjowLCJlc3RhZG8iOjQsImlhdCI6MTc3MzA5MDk0MCwiZXhwIjoxNzczMTI2OTQwfQ.eABQT46ulkh-NxfLuYcpm4_TFDh9oUfmMU78MmkwRmo');
    });
    await page.waitForTimeout(150);

    await fillDialogField(page, 'descripcion', `401 test ${Date.now()}`);

    const putRequestPromise = page
      .waitForRequest(
        (req) => /\/api\/v2\/modulos\/\d+$/.test(req.url()) && req.method() === 'PUT',
        { timeout: 15000 }
      )
      .catch(() => null);

    await clickDialogButton(page, 'Guardar');

    const putRequest = await putRequestPromise;
    expect(putRequest, 'No se emitió request PUT al guardar con token inválido.').not.toBeNull();

    const putResponse = await putRequest.response();

    if (!putResponse) {
      await expect(page.getByText(/Error de conexión|Error inesperado|Token expirado|Inicie sesión nuevamente/i).first()).toBeVisible({ timeout: 15000 });
      return;
    }

    expect(putResponse.status(), `El backend debe devolver 403 con token inválido y devolvió ${putResponse.status()}.`).toBe(401);

    await expect(page.getByText(/Debe iniciar sesión|No Autenticado|inicie sesión|unauthorized/i).first()).toBeVisible({ timeout: 15000 });

    // Restaurar token para evitar contaminación de otras pruebas.
    await page.evaluate(() => {
      localStorage.removeItem('token');
    });
  });
});
