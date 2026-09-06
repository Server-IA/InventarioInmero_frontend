import React, { useMemo, useState } from "react";
// 1. IMPORTANTE: Agregamos useLocation aquí
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

function ChangePasswordInitial() {
  const navigate = useNavigate();
  // 2. Inicializamos location para ver si el token viene desde el Login
  const location = useLocation();

  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmacionClave, setConfirmacionClave] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd = "") => pwd.length >= 8;

  const canSubmit = useMemo(() => {
    return (
      validatePassword(nuevaClave) &&
      nuevaClave === confirmacionClave &&
      !loading &&
      !success
    );
  }, [nuevaClave, confirmacionClave, loading, success]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!nuevaClave || !confirmacionClave) {
      setError("Todos los campos son obligatorios");
      return;
    }

    if (!validatePassword(nuevaClave)) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (nuevaClave !== confirmacionClave) {
      setError("Las contraseñas no coinciden");
      return;
    }

    // -----------------------------------------------------------
    // 3. ESTRATEGIA ROBUSTA PARA OBTENER EL TOKEN
    // -----------------------------------------------------------
    // Intentamos buscarlo en este orden:
    // A. En el estado de la navegación (si el Login lo pasó al redirigir)
    // B. En localStorage con el nombre "access_token"
    // C. En localStorage con el nombre "token" (muy común)
    const token = 
      location.state?.token || 
      localStorage.getItem("access_token") || 
      localStorage.getItem("token");

    // Debug en consola para que veas cuál encontró
    console.log("Token encontrado:", token);

    if (!token) {
      setError("Error crítico: No se encuentra el token de autenticación. Debes iniciar sesión nuevamente.");
      return;
    }

    try {
      setLoading(true);

      const url = "https://dev.api.inmero.co/inventario/auth/change-password-initial";

      await axios.post(
        url,
        {
          nuevaClave: nuevaClave,
          confirmacionClave: confirmacionClave,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess("¡Contraseña actualizada! Redirigiendo...");
      
      // Limpiar todo por seguridad
      localStorage.clear();

      setTimeout(() => {
        navigate("/login");
      }, 3000);

    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || "Error al cambiar la contraseña");
      } else {
        setError("Error de conexión o servidor no responde");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 420, mx: "auto", mt: 8, p: { xs: 2, md: 0 } }}>
      <Typography variant="h4" gutterBottom>
        Cambiar contraseña
      </Typography>

      {success && (
        <Alert severity="success" variant="filled" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <TextField
          label="Nueva contraseña"
          type={showPassword ? "text" : "password"}
          fullWidth
          required
          disabled={loading || !!success}
          value={nuevaClave}
          onChange={(e) => setNuevaClave(e.target.value)}
          sx={{ mb: 2 }}
          helperText="Mínimo 8 caracteres."
          error={Boolean(nuevaClave) && !validatePassword(nuevaClave)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  disabled={loading || !!success}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label="Confirmar contraseña"
          type={showConfirm ? "text" : "password"}
          fullWidth
          required
          disabled={loading || !!success}
          value={confirmacionClave}
          onChange={(e) => setConfirmacionClave(e.target.value)}
          sx={{ mb: 2 }}
          error={
            Boolean(confirmacionClave) &&
            confirmacionClave !== nuevaClave
          }
          helperText={
            confirmacionClave && confirmacionClave !== nuevaClave
              ? "Las contraseñas no coinciden."
              : " "
          }
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirm(!showConfirm)}
                  edge="end"
                  disabled={loading || !!success}
                >
                  {showConfirm ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={!canSubmit}
          sx={{ height: 48 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : success ? "¡Listo!" : "Cambiar contraseña"}
        </Button>
      </form>
    </Box>
  );
}

export default ChangePasswordInitial;