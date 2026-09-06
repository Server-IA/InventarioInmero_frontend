/* eslint-env node */
import { expect } from '@playwright/test';

const env = globalThis.process?.env ?? {};

export const BACKEND_URI = env.VITE_BACKEND_URI || 'http://localhost:8080';
export const E2E_BASE_URL = env.E2E_BASE_URL;

export const ADMIN_EMAIL = env.E2E_ADMIN_EMAIL;
export const ADMIN_PASSWORD = env.E2E_ADMIN_PASSWORD;
export const SYSTEM_ADMIN_EMAIL = env.E2E_ADMIN_EMAIL;
export const SYSTEM_ADMIN_PASSWORD = env.E2E_ADMIN_PASSWORD;
export const COMPANY_ADMIN_EMAIL = env.E2E_COMPANY_ADMIN_EMAIL || env.E2E_ADMIN_EMAIL;
export const COMPANY_ADMIN_PASSWORD = env.E2E_COMPANY_ADMIN_PASSWORD || env.E2E_ADMIN_PASSWORD;
export const NOADMIN_EMAIL = env.E2E_NOADMIN_EMAIL;
export const NOADMIN_PASSWORD = env.E2E_NOADMIN_PASSWORD;
export const COMPANY_CONTEXT_NAME = env.E2E_COMPANY_CONTEXT_NAME || '';
export const COMPANY_CONTEXT_ROLE_NAME = env.E2E_COMPANY_CONTEXT_ROLE_NAME || 'ROLE_ADMINISTRADOR_EMPRESA';

export const ONBOARDING_STATE2_EMAIL = env.E2E_ONBOARDING_STATE2_EMAIL;
export const ONBOARDING_STATE2_PASSWORD = env.E2E_ONBOARDING_STATE2_PASSWORD;
export const ONBOARDING_STATE3_EMAIL = env.E2E_ONBOARDING_STATE3_EMAIL;
export const ONBOARDING_STATE3_PASSWORD = env.E2E_ONBOARDING_STATE3_PASSWORD;

export const AUTOREGISTER_PASSWORD = env.E2E_AUTOREGISTER_PASSWORD || 'Aa123456*';
export const VERIFICATION_TOKEN = env.E2E_VERIFICATION_TOKEN;
export const VERIFICATION_TOKEN_PROVIDER_URL = env.E2E_VERIFICATION_TOKEN_PROVIDER_URL;
export const VERIFICATION_LINK_PROVIDER_URL = env.E2E_VERIFICATION_LINK_PROVIDER_URL;
export const MAILHOG_API_URL = env.E2E_MAILHOG_API_URL || 'http://localhost:8025';

export function requireEnv(name, value) {
  if (!value) throw new Error(`Falta variable de entorno requerida: ${name}`);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function exactTextRegex(value) {
  return new RegExp(`^${escapeRegex(value)}$`, 'i');
}

function unwrap(data) {
  return Array.isArray(data) ? data : data?.content ?? [];
}

export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Language': 'es',
  };
}

export function uniqueEmail(prefix = 'e2e.onboarding') {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return `${prefix}.${stamp}@example.com`;
}

export async function loginByApi(request, email, password) {
  requireEnv('VITE_BACKEND_URI', BACKEND_URI);

  const response = await request.post(`${BACKEND_URI}/auth/v2/login`, {
    data: { username: email, password },
  });

  expect(response.ok(), `Login API falló con estado ${response.status()}`).toBeTruthy();
  const data = await response.json();
  expect(data?.token, 'No se recibió token en login').toBeTruthy();
  return data;
}

export async function loginApiGetToken(request, email, password) {
  const data = await loginByApi(request, email, password);
  return data.token;
}

export async function injectAuthStorage(page, token, moduleKey = 'modulo') {
  const expiration = Date.now() + 3 * 60 * 60 * 1000;

  await page.addInitScript(
    ({ jwt, exp, activeModule }) => {
      localStorage.setItem('token', jwt);
      localStorage.setItem('token_expiration', String(exp));
      localStorage.setItem('activeModule', activeModule);
      localStorage.setItem('activeMenu', 'Seguridad');
      localStorage.setItem('tipoAplicacion', 'web');
      window.sessionStorage.setItem('e2e', 'true');
    },
    { jwt: token, exp: expiration, activeModule: moduleKey }
  );
}

function decodeJwtForStorage(jwt = '') {
  try {
    const [, raw] = jwt.split('.');
    if (!raw) return {};
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 2 ? '==' : b64.length % 4 === 3 ? '=' : '';
    const json = atob(b64 + pad);
    const payload = JSON.parse(json);
    return {
      exp: payload?.exp != null ? Number(payload.exp) : undefined,
      tver: payload?.tver != null ? Number(payload.tver) : undefined,
    };
  } catch {
    return {};
  }
}

function normalizeLoginContext(data = {}) {
  const rolesByCompany = Array.isArray(data?.rolesByCompany) ? data.rolesByCompany : [];
  let empresaId = data?.empresaId;
  let rolId = data?.rolId;
  let empresaNombre = data?.empresaNombre || '';

  if ((empresaId == null || rolId == null) && rolesByCompany.length > 0) {
    const first = rolesByCompany[0];
    empresaId = empresaId ?? first?.empresaId;
    rolId = rolId ?? first?.rolId;
    empresaNombre = empresaNombre || first?.empresaNombre || '';
  }

  return {
    empresaId,
    rolId,
    empresaNombre,
    rolesByCompany,
    nombrePersona: data?.nombrePersona || '',
  };
}

export async function injectAuthStorageFromLoginData(page, loginData, moduleKey = 'modulo') {
  const token = loginData?.token;
  expect(token, 'No se recibió token en login').toBeTruthy();

  const { exp, tver } = decodeJwtForStorage(token || '');
  const expiration = exp ? exp * 1000 : Date.now() + 3 * 60 * 60 * 1000;
  const { empresaId, rolId, empresaNombre, rolesByCompany, nombrePersona } = normalizeLoginContext(loginData);

  await page.addInitScript(
    ({ jwt, expTs, tokenVersion, activeModule, empId, roleId, empName, rolesByCo, personName }) => {
      localStorage.setItem('token', jwt);
      localStorage.setItem('token_expiration', String(expTs));
      if (typeof tokenVersion !== 'undefined') localStorage.setItem('tver', String(tokenVersion));

      if (empId != null) localStorage.setItem('empresaId', String(empId));
      if (roleId != null) localStorage.setItem('rolId', String(roleId));
      if (empName) localStorage.setItem('empresaNombre', String(empName));
      if (personName) localStorage.setItem('nombrePersona', String(personName));

      localStorage.setItem('rolesByCompany', JSON.stringify(rolesByCo || []));
      localStorage.setItem('activeModule', activeModule);
      localStorage.setItem('activeMenu', 'Seguridad');
      localStorage.setItem('tipoAplicacion', 'web');
      window.sessionStorage.setItem('e2e', 'true');
    },
    {
      jwt: token,
      expTs: expiration,
      tokenVersion: tver,
      activeModule: moduleKey,
      empId: empresaId,
      roleId: rolId,
      empName: empresaNombre,
      rolesByCo: rolesByCompany,
      personName: nombrePersona,
    }
  );
}

export async function authenticateByApi(page, request, email, password, moduleKey = 'modulo') {
  const data = await loginByApi(request, email, password);
  await injectAuthStorageFromLoginData(page, data, moduleKey);
  return data;
}

export async function loginAsAdmin(page, request, moduleKey = 'modulo') {
  requireEnv('E2E_ADMIN_EMAIL', ADMIN_EMAIL);
  requireEnv('E2E_ADMIN_PASSWORD', ADMIN_PASSWORD);
  await authenticateByApi(page, request, ADMIN_EMAIL, ADMIN_PASSWORD, moduleKey);
}

export async function loginAsAdminGetToken(request) {
  requireEnv('E2E_ADMIN_EMAIL', ADMIN_EMAIL);
  requireEnv('E2E_ADMIN_PASSWORD', ADMIN_PASSWORD);
  return loginApiGetToken(request, ADMIN_EMAIL, ADMIN_PASSWORD);
}

export async function loginAsSystemAdmin(page, request, moduleKey) {
  requireEnv('E2E_ADMIN_EMAIL', SYSTEM_ADMIN_EMAIL);
  requireEnv('E2E_ADMIN_PASSWORD', SYSTEM_ADMIN_PASSWORD);
  await authenticateByApi(page, request, SYSTEM_ADMIN_EMAIL, SYSTEM_ADMIN_PASSWORD, moduleKey);
}

export async function loginAsCompanyAdmin(page, request, moduleKey) {
  requireEnv('E2E_COMPANY_ADMIN_EMAIL/E2E_ADMIN_EMAIL', COMPANY_ADMIN_EMAIL);
  requireEnv('E2E_COMPANY_ADMIN_PASSWORD/E2E_ADMIN_PASSWORD', COMPANY_ADMIN_PASSWORD);
  await authenticateByApi(page, request, COMPANY_ADMIN_EMAIL, COMPANY_ADMIN_PASSWORD, moduleKey);
}

export async function loginAsNoAdmin(page, request, moduleKey = 'modulo') {
  requireEnv('E2E_NOADMIN_EMAIL', NOADMIN_EMAIL);
  requireEnv('E2E_NOADMIN_PASSWORD', NOADMIN_PASSWORD);
  await authenticateByApi(page, request, NOADMIN_EMAIL, NOADMIN_PASSWORD, moduleKey);
}

export async function openPublicHome(page) {
  if (E2E_BASE_URL) {
    await page.goto(E2E_BASE_URL);
  } else {
    await page.goto('/inventario/');
  }
  await expect(page.getByRole('button', { name: /Empezar Ya/i })).toBeVisible({ timeout: 20000 });
}

export async function goToRegisterFromHome(page) {
  await openPublicHome(page);
  await page.getByRole('button', { name: /Empezar Ya/i }).click();
  await expect(page.getByRole('button', { name: /register|registrar/i })).toBeVisible({ timeout: 15000 });
}

export async function goToLoginFromHome(page) {
  await openPublicHome(page);
  await page.getByRole('button', { name: /Ya tengo cuenta/i }).click();
  await expect(page.getByRole('button', { name: /iniciar sesión|login/i })).toBeVisible({ timeout: 15000 });
}

export async function fillLoginForm(page, email, password) {
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
}

export async function submitLogin(page) {
  await page.getByRole('button', { name: /iniciar sesión|login/i }).click();
}

export async function fillFieldByName(page, name, value) {
  const locator = page.locator(`input[name="${name}"], textarea[name="${name}"]`).first();
  await expect(locator).toBeVisible({ timeout: 10000 });
  await locator.fill(value);
}

export async function selectOptionByName(page, name, optionText) {
  const trigger = page.locator(`[name="${name}"]`).first();
  await expect(trigger).toBeVisible({ timeout: 10000 });
  await trigger.click();
  await page.getByRole('option', { name: optionText }).first().click();
}

export async function clickPrimaryButton(page, labelRegex) {
  await page.getByRole('button', { name: labelRegex }).first().click();
}

export async function expectBaseMenuVisible(page) {
  await expect(page.getByText(/Menú/i).first()).toBeVisible({ timeout: 20000 });
}

export async function openModuleScreen(page, moduleKey, headingRegex) {
  // Ensure we have an origin before touching localStorage.
  await page.goto('/inventario/');

  await page.evaluate(
    ({ activeModule }) => {
      localStorage.setItem('activeModule', activeModule);
      localStorage.setItem('activeMenu', 'Seguridad');
    },
    { activeModule: moduleKey }
  );

  await page.goto('/inventario/');
  if (headingRegex) {
    await expect(page.getByRole('heading', { name: headingRegex })).toBeVisible({ timeout: 20000 });
  }
}

async function openProfileMenu(page) {
  const candidates = [
    page.getByRole('button', { name: /mi perfil|perfil/i }).first(),
    page.locator('button:has(svg[data-testid="AccountCircleIcon"])').first(),
    page.locator('header button').last(),
  ];

  for (const candidate of candidates) {
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      const roleMenuItem = page.getByRole('menuitem', { name: /Cambiar empresa\/rol/i }).first();
      if (await roleMenuItem.isVisible().catch(() => false)) {
        return;
      }
    }
  }

  throw new Error('No se pudo abrir el menú de perfil para cambiar empresa/rol.');
}

export async function switchCompanyRoleFromProfile(page, options = {}) {
  const {
    companyName = COMPANY_CONTEXT_NAME,
    roleName = COMPANY_CONTEXT_ROLE_NAME,
  } = options;

  await page.goto('/inventario/');
  await openProfileMenu(page);

  const switchMenuItem = page.getByRole('menuitem', { name: /Cambiar empresa\/rol/i }).first();
  if (!(await switchMenuItem.isVisible().catch(() => false))) {
    // Single company/role context: nothing to switch.
    return;
  }

  await switchMenuItem.click();

  const dialog = page.locator('[role="dialog"]:visible').last();
  await expect(dialog.getByText(/Cambiar empresa\/rol/i)).toBeVisible({ timeout: 15000 });

  if (companyName) {
    const companyCardText = dialog.getByText(exactTextRegex(companyName)).first();
    await expect(companyCardText).toBeVisible({ timeout: 10000 });
    await companyCardText.click();
  } else {
    const firstCardAction = dialog.locator('.MuiCardActionArea-root').first();
    await expect(firstCardAction).toBeVisible({ timeout: 10000 });
    await firstCardAction.click();
  }

  if (roleName) {
    const roleText = dialog.getByText(new RegExp(escapeRegex(roleName), 'i')).first();
    await expect(roleText).toBeVisible({ timeout: 10000 });
    await roleText.click();
  }

  await dialog.getByRole('button', { name: /Cambiar/i }).click();
  await expect(dialog).not.toBeVisible({ timeout: 20000 });
  await page.waitForLoadState('domcontentloaded');
}

export async function openModuloScreen(page) {
  await openModuleScreen(page, 'modulo', /Gestión de Módulos/i);
}

export async function clickActionButton(page, actionLabel) {
  await page.getByRole('button', { name: exactTextRegex(actionLabel) }).click();
}

export async function selectFirstGridRow(page) {
  const firstRow = page.locator('[role="row"][data-id]').first();
  await expect(firstRow).toBeVisible({ timeout: 20000 });
  await firstRow.click();
}

export async function getActiveDialog(page) {
  const dialog = page.locator('[role="dialog"]:visible').last();
  await expect(dialog).toBeVisible({ timeout: 15000 });
  return dialog;
}

export async function clickCreateModuloButton(page) {
  await page.getByRole('button', { name: /^(Agregar|Crear)$/ }).click();
}

export async function clickDialogButton(page, text) {
  const dialog = await getActiveDialog(page);
  await dialog.getByRole('button', { name: exactTextRegex(text) }).click();
}

export async function fillDialogField(page, fieldName, value) {
  const dialog = await getActiveDialog(page);
  const field = dialog
    .locator(`input[name="${fieldName}"], textarea[name="${fieldName}"]`)
    .first();
  await expect(field).toBeVisible({ timeout: 10000 });
  await field.fill(value);
}

export async function fillDialogFieldByName(page, fieldName, value) {
  await fillDialogField(page, fieldName, value);
}

async function openDialogSelectByName(page, fieldName) {
  const dialog = await getActiveDialog(page);
  const nativeInput = dialog.locator(`input[name="${fieldName}"]`).first();
  await expect(nativeInput).toBeAttached({ timeout: 10000 });

  const selectTrigger = nativeInput
    .locator('xpath=ancestor::div[contains(@class,"MuiInputBase-root")]//*[@role="combobox"]')
    .first();

  if (await selectTrigger.isVisible().catch(() => false)) {
    await selectTrigger.click();
    return;
  }

  const fallbackContainer = nativeInput
    .locator('xpath=ancestor::div[contains(@class,"MuiInputBase-root")]')
    .first();
  await fallbackContainer.click();
}

export async function clickDialogSelectOption(page, fieldName, optionText) {
  await openDialogSelectByName(page, fieldName);
  await page.getByRole('option', { name: exactTextRegex(optionText) }).first().click();
}

export async function clickDialogSelectFirstOption(page, fieldName) {
  await openDialogSelectByName(page, fieldName);
  await page.getByRole('option').first().click();
}

export async function selectDialogOptionByLabel(page, labelText, optionText) {
  const dialog = await getActiveDialog(page);
  const byLabel = dialog.getByLabel(exactTextRegex(labelText)).first();
  if (await byLabel.isVisible().catch(() => false)) {
    await byLabel.click();
  } else {
    const combo = dialog.getByRole('combobox', { name: new RegExp(escapeRegex(labelText), 'i') }).first();
    await expect(combo).toBeVisible({ timeout: 10000 });
    await combo.click();
  }
  const option = page.getByRole('option', { name: exactTextRegex(optionText) }).first();
  const selectedText = (await option.textContent())?.trim() || optionText;
  await option.click();
  return selectedText;
}

export async function selectDialogFirstOptionByLabel(page, labelText) {
  const dialog = await getActiveDialog(page);
  const byLabel = dialog.getByLabel(exactTextRegex(labelText)).first();
  if (await byLabel.isVisible().catch(() => false)) {
    await byLabel.click();
  } else {
    const combo = dialog.getByRole('combobox', { name: new RegExp(escapeRegex(labelText), 'i') }).first();
    if (await combo.isVisible().catch(() => false)) {
      await combo.click();
    } else {
      const muiSelect = dialog.locator('.MuiSelect-select').first();
      await expect(muiSelect).toBeVisible({ timeout: 10000 });
      await muiSelect.click();
    }
  }
  const option = page.getByRole('option').first();
  const selectedText = ((await option.textContent()) || '').trim();
  await option.click();
  return selectedText;
}

export async function toggleDialogCheckbox(page, fieldName, checked) {
  const dialog = await getActiveDialog(page);
  const checkbox = dialog.locator(`input[type="checkbox"][name="${fieldName}"]`).first();
  await expect(checkbox).toBeVisible({ timeout: 10000 });
  const isChecked = await checkbox.isChecked();

  if (checked && !isChecked) await checkbox.check();
  if (!checked && isChecked) await checkbox.uncheck();
}

export async function openFirstAccordionInDialog(page) {
  const dialog = await getActiveDialog(page);
  const accordionButton = dialog.locator('.MuiAccordionSummary-root').first();
  await expect(accordionButton).toBeVisible({ timeout: 10000 });
  await accordionButton.click();
}

export async function clickDialogRadioByLabel(page, radioLabel) {
  const dialog = await getActiveDialog(page);
  const radio = dialog.getByRole('radio', { name: exactTextRegex(radioLabel) }).first();
  await expect(radio).toBeVisible({ timeout: 10000 });
  await radio.check();
}

export async function checkFirstDialogCheckbox(page) {
  const dialog = await getActiveDialog(page);
  const checkbox = dialog.getByRole('checkbox').first();
  await expect(checkbox).toBeVisible({ timeout: 10000 });
  await checkbox.check();
}

export async function expectSnackMessage(page, regex) {
  await expect(page.getByText(regex).first()).toBeVisible({ timeout: 20000 });
}

export async function ensureGridColumnVisible(page, columnName, options = {}) {
  const { maxScrolls = 25, step = 300 } = options;

  const header = page.getByRole('columnheader', { name: columnName }).first();
  if (await header.isVisible().catch(() => false)) {
    return header;
  }

  const scroller = page.locator('.MuiDataGrid-virtualScroller').first();
  await expect(scroller).toBeVisible({ timeout: 15000 });

  for (let index = 0; index < maxScrolls; index += 1) {
    await scroller.evaluate((element, scrollStep) => {
      const next = Math.min(element.scrollLeft + scrollStep, element.scrollWidth);
      element.scrollLeft = next;
    }, step);

    await page.waitForTimeout(80);

    if (await header.isVisible().catch(() => false)) {
      return header;
    }
  }

  throw new Error(`No se encontró la columna "${columnName}" después de scroll horizontal en DataGrid.`);
}

export async function getGridColumnIndex(page, columnName) {
  const header = await ensureGridColumnVisible(page, columnName);
  const colIndex = await header.getAttribute('aria-colindex');

  if (!colIndex) {
    throw new Error(`La columna "${columnName}" no tiene atributo aria-colindex en DataGrid.`);
  }

  return Number(colIndex);
}

export async function findGridCellInColumn(page, columnName, cellText, options = {}) {
  const { timeout = 10000 } = options;
  const colIndex = await getGridColumnIndex(page, columnName);

  const cell = page
    .locator(`[role="row"][data-id] [role="cell"][aria-colindex="${colIndex}"]`)
    .filter({ hasText: cellText })
    .first();

  await expect(cell).toBeVisible({ timeout });
  return cell;
}

export async function findGridCellInColumnAcrossPages(page, columnName, cellText, options = {}) {
  const { maxPages = 30, timeout = 10000 } = options;

  await goToGridFirstPage(page);
  const colIndex = await getGridColumnIndex(page, columnName);

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const cell = page
      .locator(`[role="row"][data-id] [role="cell"][aria-colindex="${colIndex}"]`)
      .filter({ hasText: cellText })
      .first();

    const found = (await cell.count()) > 0;
    if (found) {
      await expect(cell).toBeVisible({ timeout });
      return cell;
    }

    const moved = await goToNextGridPage(page);
    if (!moved) break;
  }

  throw new Error(`No se encontró el valor buscado en columna "${columnName}" después de recorrer la paginación.`);
}

export async function expectGridColumnValueVisible(page, columnName, cellText, options = {}) {
  const cell = await findGridCellInColumn(page, columnName, cellText, options);
  await expect(cell).toBeVisible();
  return cell;
}

export async function expectGridCheckboxIndicatorInColumn(page, columnName, options = {}) {
  const { timeout = 10000 } = options;
  const colIndex = await getGridColumnIndex(page, columnName);

  const checkbox = page
    .locator(`[role="row"][data-id] [role="cell"][aria-colindex="${colIndex}"] input[type="checkbox"]`)
    .first();

  await expect(checkbox).toBeVisible({ timeout });
  return checkbox;
}

export async function expectGridIconIndicatorInColumn(page, columnName, options = {}) {
  const { timeout = 10000 } = options;
  const colIndex = await getGridColumnIndex(page, columnName);

  const iconSvg = page
    .locator(`[role="row"][data-id] [role="cell"][aria-colindex="${colIndex}"] svg`)
    .first();

  await expect(iconSvg).toBeVisible({ timeout });
  return iconSvg;
}

export async function toggleFirstGridSwitchInColumn(page, columnName, options = {}) {
  const { timeout = 10000 } = options;
  const colIndex = await getGridColumnIndex(page, columnName);

  const switchInput = page
    .locator(`[role="row"][data-id] [role="cell"][aria-colindex="${colIndex}"] input[type="checkbox"]`)
    .first();

  await expect(switchInput).toBeVisible({ timeout });
  await switchInput.click();
  return switchInput;
}

function gridFooter(page) {
  return page.locator('.MuiDataGrid-footerContainer').first();
}

function gridPrevPageButton(page) {
  return gridFooter(page)
    .getByRole('button', {
      name: /previous|go to previous page|anterior|página anterior/i,
    })
    .first();
}

function gridNextPageButton(page) {
  return gridFooter(page)
    .getByRole('button', {
      name: /next|go to next page|siguiente|página siguiente/i,
    })
    .first();
}

export async function goToGridFirstPage(page, options = {}) {
  const { maxHops = 25 } = options;
  const prevButton = gridPrevPageButton(page);

  for (let index = 0; index < maxHops; index += 1) {
    const visible = await prevButton.isVisible().catch(() => false);
    if (!visible) return;

    const disabled = await prevButton.isDisabled().catch(() => true);
    if (disabled) return;

    await prevButton.click();
    await page.waitForTimeout(150);
  }
}

export async function goToNextGridPage(page) {
  const nextButton = gridNextPageButton(page);
  const visible = await nextButton.isVisible().catch(() => false);
  if (!visible) return false;

  const disabled = await nextButton.isDisabled().catch(() => true);
  if (disabled) return false;

  await nextButton.click();
  await page.waitForTimeout(150);
  return true;
}

export async function countFrontendGridPages(page, options = {}) {
  const { maxPages = 200 } = options;

  await goToGridFirstPage(page);

  let pages = 1;
  for (let index = 0; index < maxPages - 1; index += 1) {
    const moved = await goToNextGridPage(page);
    if (!moved) break;
    pages += 1;
  }

  await goToGridFirstPage(page);
  return pages;
}

async function fetchModuloPage(request, token, page, size) {
  const response = await request.get(`${BACKEND_URI}/api/v2/modulos?page=${page}&size=${size}`, {
    headers: authHeaders(token),
  });

  expect(response.ok(), `GET /api/v2/modulos?page=${page}&size=${size} falló con estado ${response.status()}`).toBeTruthy();
  return response.json();
}

export async function fetchBackendModuloPaginationStats(request, token, options = {}) {
  const { backendPageSize = 20, maxPages = 200 } = options;

  const firstPage = await fetchModuloPage(request, token, 0, backendPageSize);

  if (Array.isArray(firstPage)) {
    return {
      totalItems: firstPage.length,
      backendTotalPages: firstPage.length > 0 ? 1 : 0,
      backendPageSize: firstPage.length || backendPageSize,
    };
  }

  const size = Number(firstPage?.size ?? backendPageSize);
  const totalElements = Number(firstPage?.totalElements);
  const totalPages = Number(firstPage?.totalPages);

  if (Number.isFinite(totalElements)) {
    return {
      totalItems: totalElements,
      backendTotalPages: Number.isFinite(totalPages) ? totalPages : Math.ceil(totalElements / size),
      backendPageSize: size,
    };
  }

  if (Number.isFinite(totalPages)) {
    let totalItems = 0;
    for (let pageIndex = 0; pageIndex < Math.min(totalPages, maxPages); pageIndex += 1) {
      const pageData = pageIndex === 0 ? firstPage : await fetchModuloPage(request, token, pageIndex, size);
      totalItems += unwrap(pageData).length;
    }

    return {
      totalItems,
      backendTotalPages: totalPages,
      backendPageSize: size,
    };
  }

  let totalItems = 0;
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const pageData = pageIndex === 0 ? firstPage : await fetchModuloPage(request, token, pageIndex, size);
    const content = unwrap(pageData);
    totalItems += content.length;

    if (content.length < size) {
      return {
        totalItems,
        backendTotalPages: pageIndex + 1,
        backendPageSize: size,
      };
    }
  }

  return {
    totalItems,
    backendTotalPages: maxPages,
    backendPageSize: size,
  };
}

export async function fetchModulos(request, token) {
  const response = await request.get(`${BACKEND_URI}/api/v2/modulos`, {
    headers: authHeaders(token),
  });

  expect(response.ok(), `GET /api/v2/modulos falló con estado ${response.status()}`).toBeTruthy();
  const data = await response.json();
  return unwrap(data);
}

export async function fetchCatalogIds(request, token) {
  const [subsRes, tipoModRes, tipoAppRes] = await Promise.all([
    request.get(`${BACKEND_URI}/api/v1/sub-sistemas?campos=id,nombre`, { headers: authHeaders(token) }),
    request.get(`${BACKEND_URI}/api/v1/tipo-modulos?campos=id,nombre`, { headers: authHeaders(token) }),
    request.get(`${BACKEND_URI}/api/v1/tipo-aplicaciones?campos=id,nombre`, { headers: authHeaders(token) }),
  ]);

  expect(subsRes.ok(), `GET sub-sistemas falló con estado ${subsRes.status()}`).toBeTruthy();
  expect(tipoModRes.ok(), `GET tipo-modulos falló con estado ${tipoModRes.status()}`).toBeTruthy();
  expect(tipoAppRes.ok(), `GET tipo-aplicaciones falló con estado ${tipoAppRes.status()}`).toBeTruthy();

  const subs = unwrap(await subsRes.json());
  const tiposModulo = unwrap(await tipoModRes.json());
  const tiposAplicacion = unwrap(await tipoAppRes.json());

  expect(subs.length, 'No hay sub-sistemas disponibles').toBeGreaterThan(0);
  expect(tiposModulo.length, 'No hay tipo-modulos disponibles').toBeGreaterThan(0);
  expect(tiposAplicacion.length, 'No hay tipo-aplicaciones disponibles').toBeGreaterThan(0);

  return {
    subSistemaId: subs[0].id,
    tipoModuloId: tiposModulo[0].id,
    tipoAplicacionId: tiposAplicacion[0].id,
  };
}

export async function createModuloByApi(request, token, payload) {
  const response = await request.post(`${BACKEND_URI}/api/v2/modulos`, {
    headers: authHeaders(token),
    data: payload,
  });

  expect([200, 201]).toContain(response.status());

  let createdId = null;
  try {
    const body = await response.json();
    createdId = body?.id ?? null;
  } catch {
    createdId = null;
  }

  if (!createdId) {
    const location = response.headers()['location'];
    if (location) {
      const match = String(location).match(/\/(\d+)$/);
      if (match) createdId = Number(match[1]);
    }
  }

  return { response, createdId };
}

export async function fillModuloForm(page, {
  nombre,
  url,
  descripcion,
  requerido = true,
} = {}) {
  await clickDialogSelectFirstOption(page, 'subSistemaId');
  await clickDialogSelectOption(page, 'tipoModuloId', 'CRUD');
  await clickDialogSelectOption(page, 'tipoAplicacionId', 'Web');

  if (nombre != null) await fillDialogField(page, 'nombre', nombre);
  if (url != null) await fillDialogField(page, 'url', url);
  if (descripcion != null) await fillDialogField(page, 'descripcion', descripcion);

  await toggleDialogCheckbox(page, 'requerido', requerido);
}

export async function registerByApi(request, email, password) {
  requireEnv('VITE_BACKEND_URI', BACKEND_URI);

  const response = await request.post(`${BACKEND_URI}/auth/register`, {
    data: { username: email, password },
  });

  return response;
}

export async function verifyByApi(request, token) {
  requireEnv('VITE_BACKEND_URI', BACKEND_URI);
  return request.get(`${BACKEND_URI}/auth/verify?token=${encodeURIComponent(token)}`);
}

export async function isMailhogAvailable(request) {
  const response = await request.get(`${MAILHOG_API_URL}/api/v2/messages`);
  return response.ok();
}

export async function clearMailhogInbox(request) {
  const response = await request.delete(`${MAILHOG_API_URL}/api/v1/messages`);
  return response.ok();
}

function extractVerificationLink(rawText) {
  if (!rawText) return null;
  const text = String(rawText);
  const match = text.match(/https?:\/\/[^\s"'<>]*\/auth\/verify\?token=[^\s"'<>]+/i)
    || text.match(/https?:\/\/[^\s"'<>]*\/verify\?token=[^\s"'<>]+/i);
  return match?.[0] ?? null;
}

export function extractTokenFromVerificationLink(link) {
  if (!link) return null;
  try {
    const url = new URL(link);
    return url.searchParams.get('token');
  } catch {
    return null;
  }
}

async function resolveFromProvider(request, email) {
  if (!VERIFICATION_LINK_PROVIDER_URL && !VERIFICATION_TOKEN_PROVIDER_URL) return { link: null, token: null };

  if (VERIFICATION_LINK_PROVIDER_URL) {
    const sep = VERIFICATION_LINK_PROVIDER_URL.includes('?') ? '&' : '?';
    const response = await request.get(`${VERIFICATION_LINK_PROVIDER_URL}${sep}email=${encodeURIComponent(email)}`);
    if (response.ok()) {
      const data = await response.json();
      const link = data?.link || data?.verificationLink || data?.data?.link || null;
      const token = data?.token || data?.verificationToken || data?.data?.token || extractTokenFromVerificationLink(link);
      if (link || token) return { link, token };
    }
  }

  if (VERIFICATION_TOKEN_PROVIDER_URL) {
    const sep = VERIFICATION_TOKEN_PROVIDER_URL.includes('?') ? '&' : '?';
    const response = await request.get(`${VERIFICATION_TOKEN_PROVIDER_URL}${sep}email=${encodeURIComponent(email)}`);
    if (response.ok()) {
      const data = await response.json();
      const token = data?.token || data?.verificationToken || data?.data?.token || null;
      if (token) return { link: null, token };
    }
  }

  return { link: null, token: null };
}

async function resolveFromMailhog(request, email, options = {}) {
  const { timeoutMs = 30000, pollEveryMs = 3000 } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await request.get(`${MAILHOG_API_URL}/api/v2/search?kind=to&query=${encodeURIComponent(email)}`);
    if (response.ok()) {
      const data = await response.json();
      const items = data?.items || [];

      for (const item of items) {
        const content = item?.Content?.Body || item?.Raw?.Data || '';
        const link = extractVerificationLink(content);
        const token = extractTokenFromVerificationLink(link);
        if (link || token) return { link, token };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollEveryMs));
  }

  return { link: null, token: null };
}

export async function resolveVerificationLink(request, email) {
  if (VERIFICATION_LINK_PROVIDER_URL || VERIFICATION_TOKEN_PROVIDER_URL) {
    const fromProvider = await resolveFromProvider(request, email);
    if (fromProvider.link) return fromProvider.link;
    if (fromProvider.token && BACKEND_URI) {
      return `${BACKEND_URI}/auth/verify?token=${encodeURIComponent(fromProvider.token)}`;
    }
  }

  const fromMailhog = await resolveFromMailhog(request, email);
  return fromMailhog.link;
}

export async function resolveVerificationToken(request, email) {
  if (VERIFICATION_TOKEN) return VERIFICATION_TOKEN;

  const fromProvider = await resolveFromProvider(request, email);
  if (fromProvider.token) return fromProvider.token;
  if (fromProvider.link) {
    const token = extractTokenFromVerificationLink(fromProvider.link);
    if (token) return token;
  }

  const fromMailhog = await resolveFromMailhog(request, email);
  if (fromMailhog.token) return fromMailhog.token;

  return null;
}
