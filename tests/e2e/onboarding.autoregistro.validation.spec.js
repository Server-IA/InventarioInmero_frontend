import { test, expect } from '@playwright/test';
import {
  BACKEND_URI,
  E2E_BASE_URL,
  AUTOREGISTER_PASSWORD,
  ONBOARDING_STATE2_EMAIL,
  ONBOARDING_STATE2_PASSWORD,
  ONBOARDING_STATE3_EMAIL,
  ONBOARDING_STATE3_PASSWORD,
  goToRegisterFromHome,
  goToLoginFromHome,
  fillLoginForm,
  submitLogin,
  fillFieldByName,
  clickPrimaryButton,
  verifyByApi,
  selectOptionByName,
} from './helpers/e2e.shared.utils';

test.describe.skip('Autorregistro y onboarding - validaciones/edge cases', () => {
  test('ONBAV-01: registro UI valida formato de correo y contraseña', async ({ page }) => {
    test.skip(!E2E_BASE_URL, 'Configura E2E_BASE_URL para validaciones de registro UI.');

    await goToRegisterFromHome(page);
    await fillFieldByName(page, 'email', 'correo-invalido');
    await fillFieldByName(page, 'password', '123');
    await clickPrimaryButton(page, /register|registrar/i);

    await expect(page.getByText(/correo|email|contrase|password|válid|inválid/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('ONBAV-02: registro UI bloquea contraseña demasiado débil', async ({ page }) => {
    test.skip(!E2E_BASE_URL, 'Configura E2E_BASE_URL para validaciones de registro UI.');

    await goToRegisterFromHome(page);
    await fillFieldByName(page, 'email', 'usuario.prueba@example.com');
    await fillFieldByName(page, 'password', 'abc');
    await clickPrimaryButton(page, /register|registrar/i);

    await expect(page.getByText(/contrase|password|mínim|minim|segur/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('ONBAV-03: endpoint de verificación rechaza token inválido', async ({ request }) => {
    test.skip(!BACKEND_URI, 'Configura VITE_BACKEND_URI para validar endpoint de verify.');

    const response = await verifyByApi(request, 'token-invalido-e2e');
    expect([400, 404]).toContain(response.status());
  });

  test('ONBAV-04: formulario persona valida obligatorios e integridad de campos', async ({ page }) => {
    test.skip(!E2E_BASE_URL, 'Configura E2E_BASE_URL para pruebas UI de onboarding.');
    test.skip(
      !ONBOARDING_STATE2_EMAIL || !ONBOARDING_STATE2_PASSWORD,
      'Configura E2E_ONBOARDING_STATE2_EMAIL y E2E_ONBOARDING_STATE2_PASSWORD.'
    );

    await goToLoginFromHome(page);
    await fillLoginForm(page, ONBOARDING_STATE2_EMAIL, ONBOARDING_STATE2_PASSWORD);
    await submitLogin(page);

    await expect(page.getByRole('heading', { name: /Formulario Persona/i })).toBeVisible({ timeout: 20000 });

    // Primer submit: sin llenar campos → validación de obligatorios.
    await clickPrimaryButton(page, /guardar/i);
    await expect(page.getByText(/corrige|obligatorio/i).first()).toBeVisible({ timeout: 10000 });

    // Llenar con datos inválidos para validar formato.
    await fillFieldByName(page, 'nombre', 'Juan123');
    await fillFieldByName(page, 'apellido', 'Perez--');
    await fillFieldByName(page, 'email', 'correo-invalido');
    await selectOptionByName(page, 'tipoIdentificacion', /C[eé]dula|CC|Ciudadan/i);
    await fillFieldByName(page, 'identificacion', 'ABC123');
    await selectOptionByName(page, 'genero', /Masculino|Femenino/i);
    await fillFieldByName(page, 'fechaNacimiento', '2030-01-01');
    await selectOptionByName(page, 'estrato', /^2$/);
    await fillFieldByName(page, 'direccion', 'Direccion mala');
    await fillFieldByName(page, 'celular', '12AB');

    await clickPrimaryButton(page, /guardar/i);
    await expect(page.getByText(/correo|identificaci|fecha|formato|sólo números|solo numeros/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('ONBAV-05: formulario empresa valida obligatorios y NIT/correo/celular', async ({ page }) => {
    test.skip(!E2E_BASE_URL, 'Configura E2E_BASE_URL para pruebas UI de onboarding.');
    test.skip(
      !ONBOARDING_STATE3_EMAIL || !ONBOARDING_STATE3_PASSWORD,
      'Configura E2E_ONBOARDING_STATE3_EMAIL y E2E_ONBOARDING_STATE3_PASSWORD.'
    );

    await goToLoginFromHome(page);
    await fillLoginForm(page, ONBOARDING_STATE3_EMAIL, ONBOARDING_STATE3_PASSWORD);
    await submitLogin(page);

    await expect(page.getByRole('heading', { name: /Formulario Empresa/i })).toBeVisible({ timeout: 20000 });

    // Primer submit: sin llenar campos → validación de obligatorios.
    await clickPrimaryButton(page, /Guardar Empresa/i);
    await expect(page.getByText(/corrige|obligatorio/i).first()).toBeVisible({ timeout: 10000 });

    // Llenar con datos inválidos para validar formato.
    await fillFieldByName(page, 'nombre', 'Empresa Prueba');
    await fillFieldByName(page, 'contacto', 'Nombre123');
    await fillFieldByName(page, 'correo', 'correo-sin-formato');
    await fillFieldByName(page, 'celular', 'ABCD');
    await fillFieldByName(page, 'descripcion', 'Descripcion valida');
    await selectOptionByName(page, 'tipoIdentificacionId', /NIT/i);
    await fillFieldByName(page, 'identificacion', '123');
    await selectOptionByName(page, 'estadoId', /Activo/i);

    await clickPrimaryButton(page, /Guardar Empresa/i);
    await expect(page.getByText(/letras|correo|sólo números|solo numeros|NIT inválido|NIT invalido/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('ONBAV-06: registro rechaza email duplicado', async ({ page }) => {
    test.skip(!E2E_BASE_URL, 'Configura E2E_BASE_URL para validaciones de registro UI.');
    test.skip(!BACKEND_URI, 'Configura VITE_BACKEND_URI para verificar email duplicado.');

    // Usamos un email que ya está registrado (admin del sistema) para forzar duplicado.
    await goToRegisterFromHome(page);
    await fillFieldByName(page, 'email', ONBOARDING_STATE2_EMAIL || 'admin@inventario.com');
    await fillFieldByName(page, 'password', AUTOREGISTER_PASSWORD);
    await clickPrimaryButton(page, /register|registrar/i);

    await expect(
      page.getByText(/ya está registrado|ya existe|duplicado|correo ya|email ya/i).first()
    ).toBeVisible({ timeout: 15000 });
  });
});
