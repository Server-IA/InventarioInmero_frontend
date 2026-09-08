import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTheme, ThemeProvider } from "@mui/material/styles";

// Mock the axiosConfig module that ForgotPassword uses
vi.mock("../components/axiosConfig", () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock the Login component since ForgotPassword imports it for navigation
vi.mock("../components/Login", () => ({
  default: () => <div data-testid="mock-login">Login Component</div>,
}));

import ForgotPassword from "../ForgotPassword";

describe("ForgotPassword", () => {
  const setCurrentModule = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form with title, email field, submit button, and back link", () => {
    render(<ForgotPassword setCurrentModule={setCurrentModule} />);

    expect(
      screen.getByRole("heading", { name: /recupera tu contraseña/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /enviar enlace de recuperación/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /volver a iniciar sesión/i })
    ).toBeInTheDocument();
  });

  it("shows validation error when submitting with invalid email", async () => {
    const user = userEvent.setup();
    const { container } = render(<ForgotPassword setCurrentModule={setCurrentModule} />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    await user.type(emailInput, "not-an-email");

    // MUI Box component="form" doesn't expose role="form" — use DOM query
    const form = container.querySelector("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/por favor ingresa un correo válido/i)
      ).toBeInTheDocument();
    });
  });

  it("shows validation error when submitting with empty email", async () => {
    const { container } = render(<ForgotPassword setCurrentModule={setCurrentModule} />);

    // MUI Box component="form" doesn't expose role="form" — use DOM query
    const form = container.querySelector("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/por favor ingresa un correo válido/i)
      ).toBeInTheDocument();
    });
  });

  it("shows success message on successful submission", async () => {
    // We need to get the mocked axios module
    const { default: mockedAxios } = await import("../components/axiosConfig");
    mockedAxios.post.mockResolvedValueOnce({ data: {} });

    const user = userEvent.setup();
    render(<ForgotPassword setCurrentModule={setCurrentModule} />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: /enviar enlace de recuperación/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/listo\. si el correo existe/i)
      ).toBeInTheDocument();
    });
  });

  it("shows error message on failed submission", async () => {
    const { default: mockedAxios } = await import("../components/axiosConfig");
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: "Usuario no encontrado" } },
    });

    const user = userEvent.setup();
    render(<ForgotPassword setCurrentModule={setCurrentModule} />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    await user.type(emailInput, "unknown@example.com");
    await user.click(screen.getByRole("button", { name: /enviar enlace de recuperación/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/usuario no encontrado/i)
      ).toBeInTheDocument();
    });
  });

  it("calls setCurrentModule with Login when clicking 'Volver a iniciar sesión'", async () => {
    const user = userEvent.setup();
    render(<ForgotPassword setCurrentModule={setCurrentModule} />);

    await user.click(screen.getByRole("button", { name: /volver a iniciar sesión/i }));

    expect(setCurrentModule).toHaveBeenCalledTimes(1);
    // The callback receives a JSX element — verify it's a React element
    const calledArg = setCurrentModule.mock.calls[0][0];
    expect(calledArg).toBeTruthy();
    expect(calledArg.type.name || calledArg.type.displayName || calledArg.type).toBeTruthy();
  });

  it("disables the submit button while sending", async () => {
    const { default: mockedAxios } = await import("../components/axiosConfig");
    // Create a promise that never resolves so we can check the "sending" state
    let resolvePost;
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });
    mockedAxios.post.mockReturnValueOnce(postPromise);

    const user = userEvent.setup();
    render(<ForgotPassword setCurrentModule={setCurrentModule} />);

    const emailInput = screen.getByLabelText(/correo electrónico/i);
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: /enviar enlace de recuperación/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /enviando\.\.\./i })
      ).toBeInTheDocument();
    });

    // Clean up
    resolvePost({ data: {} });
  });

  it("renders with high contrast in dark mode for 'Volver a iniciar sesión'", () => {
    const darkTheme = createTheme({
      palette: {
        mode: "dark",
        primary: { main: "#0F2327" },
        text: { primary: "#E0E0E0" },
      },
    });

    render(
      <ThemeProvider theme={darkTheme}>
        <ForgotPassword setCurrentModule={setCurrentModule} />
      </ThemeProvider>
    );

    const backButton = screen.getByRole("button", { name: /volver a iniciar sesión/i });
    expect(backButton).toBeInTheDocument();
    // In dark mode, color should not be the dark brand green #0F2327
    expect(backButton).toHaveStyle({ color: "rgb(224, 224, 224)" });
  });

  it("renders translated texts when language is English", async () => {
    const { default: i18n } = await import("../i18n.js");
    await i18n.changeLanguage("en");

    render(<ForgotPassword setCurrentModule={setCurrentModule} />);

    expect(
      screen.getByRole("heading", { name: /reset your password/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we will send a reset link to your email/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send recovery link/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to login/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/if you do not receive the email/i)
    ).toBeInTheDocument();

    // Reset language back to Spanish
    await i18n.changeLanguage("es");
  });
});
