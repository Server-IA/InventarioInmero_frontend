import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import EmpresaRol from "../EmpresaRol/EmpresaRol";
import axios from "../axiosConfig";

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallbackOrOpts) => {
      if (typeof fallbackOrOpts === "string") return fallbackOrOpts;
      if (fallbackOrOpts && fallbackOrOpts.count != null) return `+${fallbackOrOpts.count}`;
      return key;
    },
    i18n: {
      changeLanguage: vi.fn(),
      language: "es",
    },
  }),
}));

// Mock axios
vi.mock("../axiosConfig", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const theme = createTheme();

const renderComponent = () =>
  render(
    <ThemeProvider theme={theme}>
      <EmpresaRol />
    </ThemeProvider>
  );

const mockEmpresaRoles = [
  { id: 1, empresaId: 1505, empresaNombre: "Coagrohuila", rolNombre: "Técnico de Mantenimiento", estadoId: 1, estadoNombre: "Activo" },
  { id: 2, empresaId: 1505, empresaNombre: "Coagrohuila", rolNombre: "Técnico de Bodega", estadoId: 2, estadoNombre: "Inactivo" },
  { id: 3, empresaId: 1505, empresaNombre: "Coagrohuila", rolNombre: "Administrador General", estadoId: 1, estadoNombre: "Activo" },
  { id: 4, empresaId: 2000, empresaNombre: "OtraEmpresa", rolNombre: "Auditor Externo", estadoId: 1, estadoNombre: "Activo" },
];

const mockCatalogRoles = [
  { id: 10, name: "Técnico de Mantenimiento" },
  { id: 20, name: "Técnico de Bodega" },
  { id: 30, name: "Administrador General" },
  { id: 40, name: "Auditor Externo" },
];

describe("EmpresaRol - Filtros HU-036.6 (Nombre y Estado)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("empresaId", "1505");
    localStorage.setItem("rolNombre", "ROLE_ADMINISTRADOR_EMPRESA");

    axios.get.mockImplementation((url) => {
      if (url.includes("/v1/empresa-rol") || url.includes("/v1/system/empresa-rol")) {
        return Promise.resolve({ data: mockEmpresaRoles });
      }
      if (url.includes("/v1/items/rol/0")) {
        return Promise.resolve({ data: mockCatalogRoles });
      }
      if (url.includes("/v1/empresa-rol-permisos/rol/")) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes("/v1/items/empresa/0")) {
        return Promise.resolve({ data: [{ id: 1505, nombre: "Coagrohuila" }, { id: 2000, nombre: "OtraEmpresa" }] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it("abre el modal de filtros y presenta campo de texto libre para nombre y selector de estado", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Técnico de Mantenimiento")).toBeInTheDocument();
    });

    const filterButton = screen.getByRole("button", { name: /(filtros|common\.actions\.filters)/i });
    fireEvent.click(filterButton);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Campo de texto libre para nombre de rol dentro del dialog
    const inputNombre = dialog.querySelector("#nombre-filter-input");
    expect(inputNombre).toBeInTheDocument();
    expect(inputNombre.tagName).toBe("INPUT");
    expect(inputNombre).toHaveAttribute("type", "text");

    // Selector de estado dentro del dialog
    expect(dialog.querySelector("#estado-filter-label")).toBeInTheDocument();
  });

  it("filtra por texto de nombre (case-insensitive) al aplicar", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Técnico de Mantenimiento")).toBeInTheDocument();
      expect(screen.getByText("Administrador General")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /(filtros|common\.actions\.filters)/i }));

    const dialog = screen.getByRole("dialog");
    const inputNombre = dialog.querySelector("#nombre-filter-input");
    await user.type(inputNombre, "técnico");

    const applyButton = screen.getByRole("button", { name: /(aplicar|common\.actions\.apply)/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("Técnico de Mantenimiento")).toBeInTheDocument();
      expect(screen.getByText("Técnico de Bodega")).toBeInTheDocument();
      expect(screen.queryByText("Administrador General")).not.toBeInTheDocument();
    });
  });

  it("filtra de forma combinada por nombre y estado Activo", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Técnico de Mantenimiento")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /(filtros|common\.actions\.filters)/i }));

    const dialog = screen.getByRole("dialog");
    const inputNombre = dialog.querySelector("#nombre-filter-input");
    await user.type(inputNombre, "técnico");

    // Abrir selector de estado y elegir Activo
    const selectEstado = dialog.querySelector("#estado-filter-label").nextElementSibling;
    fireEvent.mouseDown(selectEstado.querySelector('[role="combobox"]'));

    const options = await screen.findAllByRole("option");
    const optionActivo = options.find((opt) => opt.getAttribute("data-value") === "1");
    expect(optionActivo).toBeTruthy();
    fireEvent.click(optionActivo);

    fireEvent.click(screen.getByRole("button", { name: /(aplicar|common\.actions\.apply)/i }));

    await waitFor(() => {
      // Debe aparecer el activo pero no el inactivo ni otros
      expect(screen.getByText("Técnico de Mantenimiento")).toBeInTheDocument();
      expect(screen.queryByText("Técnico de Bodega")).not.toBeInTheDocument();
      expect(screen.queryByText("Administrador General")).not.toBeInTheDocument();
    });
  });

  it("limpiar filtros restaura el listado completo", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Administrador General")).toBeInTheDocument();
    });

    // Aplicar filtro
    fireEvent.click(screen.getByRole("button", { name: /(filtros|common\.actions\.filters)/i }));
    const dialog = screen.getByRole("dialog");
    const inputNombre = dialog.querySelector("#nombre-filter-input");
    await user.type(inputNombre, "bodega");
    fireEvent.click(screen.getByRole("button", { name: /(aplicar|common\.actions\.apply)/i }));

    await waitFor(() => {
      expect(screen.queryByText("Administrador General")).not.toBeInTheDocument();
      expect(screen.getByText("Técnico de Bodega")).toBeInTheDocument();
    });

    // Limpiar filtros usando el botón de la barra de acciones o del modal
    const clearButton = screen.getByRole("button", { name: /(limpiar|common\.actions\.clear)/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText("Administrador General")).toBeInTheDocument();
      expect(screen.getByText("Técnico de Mantenimiento")).toBeInTheDocument();
      expect(screen.getByText("Técnico de Bodega")).toBeInTheDocument();
    });
  });
});
