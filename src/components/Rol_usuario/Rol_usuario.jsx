import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  MenuItem,
  Typography,
  Box,
  Container,
  Grid,
  Alert,
  useTheme
} from "@mui/material";
import axios from "../axiosConfig";

export default function Rol_usuario({ onUserAdded }) {
  const theme = useTheme();

  // --- ESTADOS (Lógica original) ---
  const [formData, setFormData] = useState({
    username: "",
    rolId: "",
    nombre: "",
    apellido: "",
    genero: "",
    tipoDocumentoIdentidadId: "",
    codigoIdentificacion: "",
    fechaNacimiento: "",
    estrato: "",
    direccion: "",
    celular: ""
  });

  const [listaRoles, setListaRoles] = useState([]);
  const [listaTiposDoc, setListaTiposDoc] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  // --- EFECTOS (Carga de catálogos) ---
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [rolesRes, docsRes] = await Promise.all([
          axios.get("v1/items/rol/0"),
          axios.get("v1/items/tipo_identificacion/0")
        ]);

        // Adaptamos la respuesta según venga como array directo o paginado
        setListaRoles(Array.isArray(rolesRes.data) ? rolesRes.data : rolesRes.data?.data || []);
        setListaTiposDoc(Array.isArray(docsRes.data) ? docsRes.data : docsRes.data?.data || []);
      } catch {
        setFeedback({ type: "error", message: "Error cargando catálogos del sistema." });
      }
    };
    fetchCatalogos();
  }, []);

  // --- HANDLERS ---
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true); // Activa la visualización de errores

    // Validación básica: verificar que no haya campos vacíos
    const isFormValid = Object.values(formData).every((value) => value !== "");

    if (!isFormValid) {
      setFeedback({ type: "error", message: "Por favor complete los campos obligatorios marcados en rojo." });
      return;
    }

    setLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      await axios.post(
        "https://dev.api.inmero.co/inventario/auth/empresa/usuario-roles",
        {
          ...formData,
          rolId: Number(formData.rolId),
          tipoDocumentoIdentidadId: Number(formData.tipoDocumentoIdentidadId),
          estrato: Number(formData.estrato)
        }
      );

      setFeedback({ type: "success", message: "Usuario creado exitosamente" });
      if (onUserAdded) onUserAdded();

      // Resetear formulario
      setSubmitted(false);
      setFormData({
        username: "", rolId: "", nombre: "", apellido: "", genero: "",
        tipoDocumentoIdentidadId: "", codigoIdentificacion: "",
        fechaNacimiento: "", estrato: "", direccion: "", celular: ""
      });

    } catch (error) {
      setFeedback({ type: "error", message: "No se pudo crear el usuario. Verifique la conexión." });
    } finally {
      setLoading(false);
    }
  };

  // Helper para validación visual
  const hasError = (field) => submitted && !formData[field];

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        
        padding: 3
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          p: { xs: 3, sm: 4 },
          bgcolor: 'background.paper',
          borderRadius: 2, // Bordes ligeramente redondeados como en MUI
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          width: '100%',
          maxWidth: 990,
        }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 700, color: '#333', mb: 3 }}>
            Creación de Usuario
          </Typography>

          {/* MENSAJES DE FEEDBACK (ALERTAS MUI) */}
          {feedback.message && (
            <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 3 }}>
              {feedback.message}
            </Alert>
          )}

          <Grid container spacing={3}>
            
            {/* --- SECCIÓN: INFORMACIÓN PERSONAL --- */}
            <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold', mb: 1 }}>
                    INFORMACIÓN PERSONAL
                </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="nombre"
                name="nombre"
                label="Nombre"
                variant="outlined"
                value={formData.nombre}
                onChange={handleChange}
                error={hasError('nombre')}
                helperText={hasError('nombre') ? "Requerido" : ""}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="apellido"
                name="apellido"
                label="Apellido"
                variant="outlined"
                value={formData.apellido}
                onChange={handleChange}
                error={hasError('apellido')}
                helperText={hasError('apellido') ? "Requerido" : ""}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="fechaNacimiento"
                name="fechaNacimiento"
                label="Fecha de Nacimiento"
                type="date"
                variant="outlined"
                value={formData.fechaNacimiento}
                onChange={handleChange}
                error={hasError('fechaNacimiento')}
                helperText={hasError('fechaNacimiento') ? "Requerido" : ""}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
               <TextField
                select
                required
                fullWidth
                id="genero"
                name="genero"
                label="Género"
                value={formData.genero}
                onChange={handleChange}
                error={hasError('genero')}
                helperText={hasError('genero') ? "Requerido" : ""}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="" disabled>Seleccione</MenuItem>
                <MenuItem value="Masculino">Masculino</MenuItem>
                <MenuItem value="Femenino">Femenino</MenuItem>
              </TextField>
            </Grid>

            {/* --- SECCIÓN: DOCUMENTO --- */}
            <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold', mb: 1 }}>
                    IDENTIFICACIÓN
                </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                required
                fullWidth
                id="tipoDocumentoIdentidadId"
                name="tipoDocumentoIdentidadId"
                label="Tipo de Documento"
                value={formData.tipoDocumentoIdentidadId}
                onChange={handleChange}
                error={hasError('tipoDocumentoIdentidadId')}
                helperText={hasError('tipoDocumentoIdentidadId') ? "Requerido" : ""}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="" disabled>Seleccione</MenuItem>
                {listaTiposDoc.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.nombre || d.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="codigoIdentificacion"
                name="codigoIdentificacion"
                label="Número de Identificación"
                value={formData.codigoIdentificacion}
                onChange={handleChange}
                error={hasError('codigoIdentificacion')}
                helperText={hasError('codigoIdentificacion') ? "Requerido" : ""}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* --- SECCIÓN: CONTACTO --- */}
            <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold', mb: 1 }}>
                    CONTACTO Y CUENTA
                </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="username"
                name="username"
                label="Correo Electrónico"
                type="email"
                value={formData.username}
                onChange={handleChange}
                error={hasError('username')}
                helperText={hasError('username') ? "Requerido" : ""}
                InputLabelProps={{ shrink: true }}
                placeholder="ejemplo@correo.com"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="celular"
                name="celular"
                label="Celular"
                value={formData.celular}
                onChange={handleChange}
                error={hasError('celular')}
                helperText={hasError('celular') ? "Requerido" : ""}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                id="direccion"
                name="direccion"
                label="Dirección"
                value={formData.direccion}
                onChange={handleChange}
                error={hasError('direccion')}
                helperText={hasError('direccion') ? "Requerido" : ""}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
               <TextField
                select
                required
                fullWidth
                id="estrato"
                name="estrato"
                label="Estrato"
                value={formData.estrato}
                onChange={handleChange}
                error={hasError('estrato')}
                helperText={hasError('estrato') ? "Requerido" : ""}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="" disabled>Seleccione</MenuItem>
                {[1,2,3,4,5,6].map((n) => (
                    <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* --- SECCIÓN: ROL --- */}
            <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold', mb: 1, mt: 1 }}>
                    ROL EN EL SISTEMA
                </Typography>
            </Grid>

            <Grid item xs={12}>
               <TextField
                select
                required
                fullWidth
                id="rolId"
                name="rolId"
                label="Rol Asignado"
                value={formData.rolId}
                onChange={handleChange}
                error={hasError('rolId')}
                helperText={hasError('rolId') ? "Requerido" : ""}
                InputLabelProps={{ shrink: true }}
                sx={{ bgcolor: 'background.paper' }}
                // Esto asegura que se vea el texto "Seleccione Rol" cuando está vacío
                SelectProps={{ displayEmpty: true }} 
              >
                <MenuItem value="" disabled>
                  <Typography color="textSecondary">Seleccione Rol</Typography>
                </MenuItem>
                
                {listaRoles.map((r, index) => {
                  // Validamos diferentes nombres posibles para el ID y el Nombre
                  const val = r.id ?? r.rolId ?? r.code ?? index;
                  const label = r.nombre ?? r.name ?? r.descripcion ?? "Sin Nombre";
                  
                  return (
                    <MenuItem key={val} value={val}>
                      {label}
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>

          </Grid>

          <Box sx={{ mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
              sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem' }}
            >
              {loading ? "GUARDANDO..." : "CREAR USUARIO"}
            </Button>
          </Box>
        </form>
      </Box>
    </Container>
  );
}