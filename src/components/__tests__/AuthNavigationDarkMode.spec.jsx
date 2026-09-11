import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import Login from "../Login";
import Register from "../Register";

// Helper to render with theme mode
const renderWithTheme = (ui, mode = "light") => {
  const theme = createTheme({
    palette: {
      mode,
      primary: { main: "#0F2327" },
      background: { paper: mode === "dark" ? "#1B1F22" : "#fff" },
      text: { primary: mode === "dark" ? "#E0E0E0" : "#2B3445" },
    },
  });
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

// Mock useNavigate from react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("Issue #288 - Auth links dark mode and navigation", () => {
  it("Login: clicking register link calls setCurrentModule with Register component", () => {
    const setCurrentModule = vi.fn();
    renderWithTheme(<Login setCurrentModule={setCurrentModule} />);

    // In English default test-setup i18n it's "Register here" or in Spanish "Regístrate aquí"
    const registerLink = screen.getByRole("button", { name: /(regístrate aquí|register here)/i });
    expect(registerLink).toBeInTheDocument();

    fireEvent.click(registerLink);
    expect(setCurrentModule).toHaveBeenCalledTimes(1);
    const calledArg = setCurrentModule.mock.calls[0][0];
    expect(calledArg).toBeTruthy();
    expect(calledArg.type.name || calledArg.type.displayName || calledArg.type).toBeTruthy();
  });

  it("Register: clicking login link calls setCurrentModule with Login component", () => {
    const setCurrentModule = vi.fn();
    renderWithTheme(<Register setCurrentModule={setCurrentModule} />);

    const loginLink = screen.getByRole("button", { name: /(inicia sesión aquí|login here)/i });
    expect(loginLink).toBeInTheDocument();

    fireEvent.click(loginLink);
    expect(setCurrentModule).toHaveBeenCalledTimes(1);
    const calledArg = setCurrentModule.mock.calls[0][0];
    expect(calledArg).toBeTruthy();
    expect(calledArg.type.name || calledArg.type.displayName || calledArg.type).toBeTruthy();
  });

  it("Login: links in dark mode do not use #0F2327 (dark text on dark card)", () => {
    renderWithTheme(<Login setCurrentModule={vi.fn()} />, "dark");

    const forgotBtn = screen.getByRole("button", { name: /(¿olvidaste tu contraseña\?|forgot your password\?)/i });
    const registerLink = screen.getByRole("button", { name: /(regístrate aquí|register here)/i });

    expect(forgotBtn).toHaveStyle({ color: "rgb(224, 224, 224)" });
    expect(registerLink).toHaveStyle({ color: "rgb(224, 224, 224)" });
  });

  it("Register: link in dark mode does not use #0F2327 (dark text on dark card)", () => {
    renderWithTheme(<Register setCurrentModule={vi.fn()} />, "dark");

    const loginLink = screen.getByRole("button", { name: /(inicia sesión aquí|login here)/i });
    expect(loginLink).toHaveStyle({ color: "rgb(224, 224, 224)" });
  });
});
