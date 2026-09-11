/*=============================================================================
 Nombre del archivo : Register.jsx
 Descripcion        : Formulario de registro de usuario con soporte i18n.
===============================================================================
 CONTROL DE CAMBIOS
 +------------+---------+----------------------+-----------------------------+
 |   Fecha    | Versión |      Autor           | Descripción del cambio      |
 +------------+---------+----------------------+-----------------------------+
 | 2026-05-08 | 0.4.0   | Cesar Medina         | Creación del archivo.       |
 | 2026-09-08 | 0.4.0   | Jeisson Sanchez      | [Issue #288] Contraste en modo oscuro y navegación a Login. |
 +------------+---------+----------------------+-----------------------------+
=============================================================================*/
/**
 * @module Register
 * @description Renderiza el formulario de registro, valida credenciales y
 * envía el idioma activo al backend para mensajes y notificaciones.
 */
import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  Link,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { resolveAppLanguage } from "../i18n.js";
import Login from "./Login";

export default function Register(props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Fondo de página coherente con Inicio/Login
  const softBg = isDark ? alpha(theme.palette.primary.light, 0.08) : "#e7f6f7";

  // — Tokens “fuertes” para modo oscuro —
  const cardBg      = isDark ? theme.palette.background.paper : "#fff";
  const inputBg     = isDark ? alpha(theme.palette.common.white, 0.06) : "#fff";
  const inputText   = isDark ? alpha("#FFFFFF", 0.92) : theme.palette.text.primary;
  const labelColor  = isDark ? alpha("#FFFFFF", 0.75) : theme.palette.text.secondary;
  const borderBase  = isDark ? alpha("#FFFFFF", 0.18) : alpha(theme.palette.primary.main, 0.35);
  const borderFocus = theme.palette.primary.main;
  const borderWrap  = isDark ? alpha(theme.palette.primary.light, 0.45)
                             : alpha(theme.palette.primary.main, 0.35);

  const textSecondary = theme.palette.text.secondary;
  const linkColor = isDark ? theme.palette.text.primary : theme.palette.primary.main;

  // Fix para autofill en dark (que no ponga azul)
  const autofillStyles = {
    WebkitBoxShadow: `0 0 0 1000px ${inputBg} inset`,
    WebkitTextFillColor: inputText,
    caretColor: inputText,
    transition: "background-color 9999s ease-out 0s",
  };

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleClickShowPassword = () => setShowPassword((s) => !s);
  const handleMouseDownPassword = (e) => e.preventDefault();

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (pwd) =>
    /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/.test(pwd);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!validateEmail(username)) {
      setError(t("auth.messages.invalidEmail"));
      return;
    }
    if (!validatePassword(password)) {
      setError(t("auth.messages.invalidPassword"));
      return;
    }

    try {
      await axios.post(
        import.meta.env.VITE_BACKEND_URI + "/auth/register",
        { username, password },
        { headers: { "Accept-Language": resolveAppLanguage() } }
      );
      setSuccessMessage(t("auth.register.success"));
    } catch (err) {
      if (err.response?.status === 403) {
        setError(err.response?.data?.message || t("auth.register.duplicateEmail"));
      } else {
        setError(err.response?.data?.message || t("auth.register.alreadySent"));
      }
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100svw",
        ml: "calc(50% - 50svw)",
        mr: "calc(50% - 50svw)",
        "@supports not (width: 100svw)": {
          width: "100vw",
          ml: "calc(50% - 50vw)",
          mr: "calc(50% - 50vw)",
        },
        bgcolor: softBg,
        pt: { xs: 10, md: 12 },
        pb: { xs: 8, md: 10 },
        display: "flex",
        justifyContent: "center",
      }}
    >
      {/* Card formulario (mismas proporciones que Login) */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: "100%",
          maxWidth: 440,
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          bgcolor: cardBg,
          boxShadow: "none",
          position: "relative",
          "&:before": {
            content: '""',
            position: "absolute",
            inset: 0,
            borderRadius: 3,
            border: `2px solid ${borderWrap}`,
            pointerEvents: "none",
          },
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          align="center"
          sx={{ fontWeight: 800, lineHeight: 1.05, mb: 1 }}
        >
          {t("auth.register.title")}
        </Typography>

        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
        {successMessage && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            {successMessage}
          </Alert>
        )}

        <TextField
          label={t("auth.fields.email")}
          variant="outlined"
          type="email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          InputLabelProps={{
            sx: { color: labelColor, "&.Mui-focused": { color: borderFocus } },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: inputBg,
              color: inputText,
              "& fieldset": { borderColor: borderBase },
              "&:hover fieldset": { borderColor: alpha(borderFocus, 0.8) },
              "&.Mui-focused fieldset": { borderColor: borderFocus },
            },
            "& input:-webkit-autofill": autofillStyles,
            "& input:-webkit-autofill:hover": autofillStyles,
            "& input:-webkit-autofill:focus": autofillStyles,
            "& input:-webkit-autofill:active": autofillStyles,
          }}
        />

        <TextField
          label={t("auth.fields.password")}
          variant="outlined"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          InputLabelProps={{
            sx: { color: labelColor, "&.Mui-focused": { color: borderFocus } },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: inputBg,
              color: inputText,
              "& fieldset": { borderColor: borderBase },
              "&:hover fieldset": { borderColor: alpha(borderFocus, 0.8) },
              "&.Mui-focused fieldset": { borderColor: borderFocus },
            },
            "& input:-webkit-autofill": autofillStyles,
            "& input:-webkit-autofill:hover": autofillStyles,
            "& input:-webkit-autofill:focus": autofillStyles,
            "& input:-webkit-autofill:active": autofillStyles,
          }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{
            py: "12px",
            borderRadius: 3,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          {t("auth.register.submit")}
        </Button>

        <Typography variant="body2" align="center" sx={{ mt: 1, color: textSecondary }}>
          {t("auth.register.alreadyHaveAccount")}{" "}
          <Link
            component="button"
            type="button"
            onClick={() =>
              props.setCurrentModule?.(
                <Login
                  setCurrentModule={props.setCurrentModule}
                  setIsAuthenticated={props.setIsAuthenticated}
                />
              )
            }
            sx={{
              color: linkColor,
              fontWeight: 700,
              textDecoration: "none",
              verticalAlign: "baseline",
            }}
          >
            {t("auth.register.loginHere")}
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}

Register.propTypes = {
  setCurrentModule: PropTypes.func,
  setIsAuthenticated: PropTypes.func,
};
