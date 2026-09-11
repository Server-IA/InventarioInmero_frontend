/*=============================================================================
Nombre del archivo : FormEmpresaRol.jsx
Descripción        : Formulario modal para crear y editar asignaciones de Empresa Rol.
===============================================================================
CONTROL DE CAMBIOS
+------------+---------+----------------------+-----------------------------------------------+
|   Fecha    | Versión |      Autor           | Descripción del cambio                        |
+------------+---------+----------------------+-----------------------------------------------+
| 2026-05-22 | 0.4.0   | Cesar Medina         | Se corrige referencia de tema en el modal.    |
| 2026-08-25 | 0.4.0   | Jeisson Sanchez      | [Issue #278] Enviar empresa objetivo al quitar permiso. |
+------------+---------+----------------------+-----------------------------------------------+
=============================================================================*/
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import axios from "../axiosConfig";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Typography,
  Box,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslation } from "react-i18next";

export default function FormEmpresaRol({
  open,
  setOpen,
  selectedRow,
  setSelectedRow,
  setMessage,
  reloadData,
  roles,
  empresaId,
  isSystemAdmin = false,
}) {
  const { t } = useTranslation();
  // Cambio 2026-05-22: se define el tema para evitar errores de referencia en accordions y permisos.
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isEdit = Boolean(selectedRow?.id);
  const permisosLegacyParams = (targetEmpresaId) =>
    isSystemAdmin ? { params: { empresaId: Number(targetEmpresaId) } } : undefined;

  const [rolId, setRolId] = useState("");
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingModulos, setLoadingModulos] = useState(false);
  const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);
  const [permisosOriginales, setPermisosOriginales] = useState([]);
  const [subsistemas, setSubsistemas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState(empresaId ?? "");

  const handleClose = () => {
    setOpen(false);
    setSelectedRow(null);
    setRolId("");
    setPermisosSeleccionados([]);
    setPermisosOriginales([]);
    setSelectedEmpresaId(empresaId ?? "");
  };

  const getTargetEmpresaId = () =>
    Number(selectedEmpresaId || selectedRow?.empresaId || empresaId);

  const getLegacyParams = () =>
    isSystemAdmin ? { params: { empresaId: getTargetEmpresaId() } } : undefined;

  const loadEmpresas = async () => {
    if (!isSystemAdmin) return;

    try {
      const res = await axios.get("/v1/items/empresa/0");
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.content)
        ? res.data.content
        : [];
      setEmpresas(list);
    } catch {
      setEmpresas([]);
      setMessage({
        open: true,
        severity: "error",
        text: t("empresaRol.messages.companiesLoadError"),
      });
    }
  };

  /* ===============================
     Obtener rol por nombre
  =============================== */
  const obtenerRolIdPorNombre = async (nombreRol) => {
    try {
      const res = await axios.get("/v1/items/rol/0");
      const rolEncontrado = res.data.find((r) => r.name === nombreRol);
      return rolEncontrado?.id || null;
    } catch (error) {
      console.error("Error obteniendo roles:", error);
      return null;
    }
  };

  /* ===============================
     Cargar módulos
  =============================== */

const cargarSubsistemas = async () => {
  try {
    const res = await axios.get(
      "/v1/sub-sistemas?campos=id,nombre"
    );

    setSubsistemas(res.data);
  } catch (error) {
    setMessage({
      open: true,
      severity: "error",
      text: t("empresaRol.messages.subsystemsLoadError"),
    });
  }
};

const cargarModulos = async () => {
  try {
    setLoadingModulos(true);

    if (!subsistemas.length) return;

    const resultados = await Promise.all(
      subsistemas.map(async (sub) => {
        const res = await axios.get(
          `/v1/empresa-rol-permisos/modulos-subsistema?subsistemaIds=${sub.id}`
        );

        return res.data.map((modulo) => ({
          ...modulo,
          subsistemaId: sub.id,
          subsistemaNombre: sub.nombre,
        }));
      })
    );

    const todos = resultados.flat();
    setModulos(todos);
  } catch (error) {
    setMessage({
      open: true,
      severity: "error",
      text: t("empresaRol.messages.modulesLoadError"),
    });
  } finally {
    setLoadingModulos(false);
  }
};

const agruparPorSubsistema = (modulosArray) => {
  const mapa = {};

  modulosArray.forEach((modulo) => {
    const key = modulo.subsistemaId;

    if (!mapa[key]) {
      mapa[key] = {
        id: modulo.subsistemaId,
        nombre: modulo.subsistemaNombre,
        modulos: [],
      };
    }

    mapa[key].modulos.push(modulo);
  });

  return Object.values(mapa);
};

  /* ===============================
     Cargar permisos actuales
  =============================== */
  const cargarPermisosActuales = async (rolId) => {
    try {
      const res = await axios.get(
        `/v1/empresa-rol-permisos/rol/${rolId}/permisos`,
        permisosLegacyParams(selectedRow?.empresaId ?? empresaId)
      );

      const ids = res.data.map((p) => p.id);
      setPermisosSeleccionados(ids);
      setPermisosOriginales(ids);
    } catch (error) {
      console.error("Error cargando permisos actuales", error);
    }
  };

  /* ===============================
     INIT
  =============================== */
    useEffect(() => {
      if (!open) return;

      const init = async () => {
        if (isSystemAdmin) {
          await loadEmpresas();
        }
        await cargarSubsistemas();
      };

      init();
    }, [open, isSystemAdmin]);
    useEffect(() => {
      if (subsistemas.length > 0) {
        cargarModulos();
      }
    }, [subsistemas]);
      useEffect(() => {
      if (!open || !subsistemas.length || !modulos.length) return;

      const initRol = async () => {
        if (isEdit && selectedRow) {
          if (isSystemAdmin && selectedRow?.empresaId) {
            setSelectedEmpresaId(selectedRow.empresaId);
          }

          let idRol = selectedRow.rolId;

          if (!idRol && selectedRow.rolNombre) {
            idRol = await obtenerRolIdPorNombre(selectedRow.rolNombre);
          }

          if (!idRol) return;

          setRolId(idRol);
          await cargarPermisosActuales(idRol);
        }
      };

      initRol();
    }, [open, selectedRow, subsistemas, modulos, isSystemAdmin]);

  /* ===============================
     Toggle permiso (solo visual)
  =============================== */
  const togglePermiso = (permisoId) => {
    setPermisosSeleccionados((prev) =>
      prev.includes(permisoId)
        ? prev.filter((id) => id !== permisoId)
        : [...prev, permisoId]
    );
  };

  const seleccionarTodosModulo = (permisos) => {
    const ids = permisos.map((p) => p.id);

    const todosSeleccionados = ids.every((id) =>
      permisosSeleccionados.includes(id)
    );

    if (todosSeleccionados) {
      setPermisosSeleccionados((prev) =>
        prev.filter((id) => !ids.includes(id))
      );
    } else {
      setPermisosSeleccionados((prev) => [
        ...new Set([...prev, ...ids]),
      ]);
    }
  };

  /* ===============================
     Quitar permiso (solo estado local)
  =============================== */
  const quitarPermiso = async (permisoId) => {
    try {
      await axios.delete(
        `/v1/empresa-rol-permisos/rol/${rolId}/permisos/quitar`,
        {
          data: { permisosId: [permisoId] },
          ...(isSystemAdmin ? { params: { empresaId: getTargetEmpresaId() } } : {}),
        }
      );

      setPermisosSeleccionados((prev) =>
        prev.filter((id) => id !== permisoId)
      );

      setMessage({
        open: true,
        severity: "success",
        text: t("empresaRol.messages.permissionRemoved"),
      });
    } catch (error) {
      console.error(error.response?.data);
      setMessage({
        open: true,
        severity: "error",
        text: t("empresaRol.messages.permissionRemoveError"),
      });
    }
  };

  /* ===============================
     Guardar (solo agrega nuevos)
  =============================== */
const handleSave = async () => {
  if (!rolId) {
    setMessage({
      open: true,
      severity: "warning",
      text: t("empresaRol.messages.roleRequired"),
    });
    return;
  }

  if (isSystemAdmin && !getTargetEmpresaId()) {
    setMessage({
      open: true,
      severity: "warning",
      text: t("empresaRol.messages.companyRequired"),
    });
    return;
  }

  try {
    setLoading(true);

    if (!isEdit) {
        await axios.post(
          isSystemAdmin ? "/v1/system/empresa-rol" : "/v1/empresa-rol",
          isSystemAdmin
            ? {
                empresaId: Number(selectedRow?.empresaId ?? empresaId),
                rolId: Number(rolId),
              }
            : {
                rolId: Number(rolId),
              }
        );
    }

    let modulosALL = [];
    let permisosINDIVIDUAL = [];

    modulos.forEach((modulo) => {
      const permisosModuloIds = modulo.permisos.map((p) => p.id);

      const todosSeleccionados =
        permisosModuloIds.length > 0 &&
        permisosModuloIds.every((id) =>
          permisosSeleccionados.includes(id)
        );

      if (todosSeleccionados) {
        modulosALL.push(modulo.moduloId);
      } else {
        permisosModuloIds.forEach((id) => {
          if (permisosSeleccionados.includes(id)) {
            permisosINDIVIDUAL.push(id);
          }
        });
      }
    });

/* ===============================
   Ejecutar ALL
=============================== */

let permisosALLIds = [];

if (modulosALL.length > 0) {
  await axios.post(
    `/v1/empresa-rol-permisos/${rolId}/asignar-modulos-permisos`,
    { modulosIds: modulosALL },
    getLegacyParams()
  );

  //  Obtener todos los permisos que pertenecen a los módulos ALL
  modulos.forEach((modulo) => {
    if (modulosALL.includes(modulo.moduloId)) {
      modulo.permisos.forEach((p) => {
        permisosALLIds.push(p.id);
      });
    }
  });
}

/* ===============================
   Sincronizar diferencias (alta/baja)
=============================== */

const originalesSet = new Set(permisosOriginales);
const seleccionadosSet = new Set(permisosSeleccionados);

const permisosAQuitar = permisosOriginales.filter((id) => !seleccionadosSet.has(id));

let permisosNuevos = permisosSeleccionados.filter((id) => !originalesSet.has(id));

permisosNuevos = permisosNuevos.filter((id) => !permisosALLIds.includes(id));

if (permisosAQuitar.length > 0) {
  await axios.delete(
    `/v1/empresa-rol-permisos/rol/${rolId}/permisos/quitar`,
    {
      data: { permisosId: permisosAQuitar },
      ...(isSystemAdmin ? { params: { empresaId: getTargetEmpresaId() } } : {}),
    }
  );
}

if (permisosNuevos.length > 0) {
  await axios.post(
    `/v1/empresa-rol-permisos/rol/${rolId}/permisos`,
    { permisosId: permisosNuevos },
    getLegacyParams()
  );
}

    setMessage({
      open: true,
      severity: "success",
      text: t("empresaRol.messages.saveSuccess"),
    });

    reloadData();
    handleClose();
  } catch (error) {
    console.error(error.response?.data);

    setMessage({
      open: true,
      severity: "error",
      text: t("empresaRol.messages.saveError"),
    });
  } finally {
    setLoading(false);
  }
};
  /* ===============================
     Separar módulos
  =============================== */
    const modulosConPermiso = modulos.filter((modulo) =>
      modulo.permisos.some((p) => permisosSeleccionados.includes(p.id))
    );

    const modulosSinPermiso = modulos.filter((modulo) =>
      !modulo.permisos.some((p) => permisosSeleccionados.includes(p.id))
    );

const subsConPermiso = agruparPorSubsistema(modulosConPermiso);
const subsSinPermiso = agruparPorSubsistema(modulosSinPermiso);
const subsistemasAgrupados = agruparPorSubsistema(modulos);

  const renderModulo = (modulo) => (
    <Accordion
      key={modulo.moduloId}
      sx={{
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 600 }}>
          {modulo.moduloNombre}
        </Typography>
      </AccordionSummary>

      <AccordionDetails>
        <Box sx={{ mb: 2, display: "flex", alignItems: "center" }}>
          <Checkbox
            checked={
              modulo.permisos.length > 0 &&
              modulo.permisos.every((p) =>
                permisosSeleccionados.includes(p.id)
              )
            }
            onChange={() =>
              seleccionarTodosModulo(modulo.permisos)
            }
          />
          <Typography sx={{ fontWeight: 600 }}>
            {t("common.labels.allPermissions")}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(250px, 1fr))",
            gap: 2,
          }}
        >
          {modulo.permisos.map((permiso) => {
            const checked =
              permisosSeleccionados.includes(permiso.id);

            return (
              <Box
                key={permiso.id}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: checked
                    ? `1px solid ${theme.palette.primary.main}`
                    : `1px solid ${theme.palette.divider}`,
                  backgroundColor: checked
                    ? alpha(theme.palette.primary.main, isDark ? 0.2 : 0.08)
                    : theme.palette.background.default,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box
                  onClick={() =>
                    togglePermiso(permiso.id)
                  }
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    cursor: "pointer",
                  }}
                >
                  <Checkbox size="small" checked={checked} />
                  <Typography variant="body2">
                    {permiso.nombre}
                  </Typography>
                </Box>

                {isEdit && checked && (
                  <Button
                    size="small"
                    color="error"
                    sx={{
                      "&.Mui-disabled": {
                        color: theme.palette.text.disabled,
                      },
                    }}
                    onClick={() =>
                      quitarPermiso(permiso.id)
                    }
                  >
                    {t("common.actions.remove")}
                  </Button>
                )}
              </Box>
            );
          })}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
  const renderSubsistema = (sub) => (
  <Accordion
    key={sub.id}
    sx={{
      mb: 1,
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      "&:before": { display: "none" },
    }}
  >
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography sx={{ fontWeight: 700 }}>
        {sub.nombre}
      </Typography>
    </AccordionSummary>

    <AccordionDetails>
      {sub.modulos.map(renderModulo)}
    </AccordionDetails>
  </Accordion>
);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>
        {isEdit
          ? t("empresaRol.form.editTitle")
          : t("empresaRol.form.createTitle")}
      </DialogTitle>

      <DialogContent>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>{t("empresaRol.form.roleLabel")}</InputLabel>
          <Select
            value={rolId}
            onChange={(e) => setRolId(e.target.value)}
            disabled={isEdit}
          >
            {roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.nombre ?? r.name ?? r.rolNombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isSystemAdmin && (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>{t("empresaRol.form.companyLabel")}</InputLabel>
            <Select
              value={selectedEmpresaId}
              label={t("empresaRol.form.companyLabel")}
              onChange={(e) => setSelectedEmpresaId(e.target.value)}
              disabled={isEdit}
            >
              {empresas.map((e) => (
                <MenuItem key={e.id} value={e.id}>
                  {e.nombre ?? e.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Divider sx={{ mb: 2 }} />        
              {loadingModulos ? (
        <CircularProgress />
      ) : (
     <>
      {isEdit ? (
        <>
          {subsConPermiso.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {t("empresaRol.permissions.withPermissionsModules")}
              </Typography>
              {subsConPermiso.map(renderSubsistema)}
            </>
          )}

          {subsSinPermiso.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
                {t("empresaRol.permissions.withoutAssignedPermissions")}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, opacity: 0.7 }}>
                {t("empresaRol.permissions.withoutAssignedPermissionsHelp")}
              </Typography>
              {subsSinPermiso.map(renderSubsistema)}
            </>
          )}
        </>
      ) : (
        subsistemasAgrupados.map(renderSubsistema)
      )}
      </>
    )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>{t("common.actions.close")}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? t("common.labels.loading") : t("common.actions.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

FormEmpresaRol.propTypes = {
  open: PropTypes.bool.isRequired,
  setOpen: PropTypes.func.isRequired,
  selectedRow: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    empresaId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    rolId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    rolNombre: PropTypes.string,
  }),
  setSelectedRow: PropTypes.func.isRequired,
  setMessage: PropTypes.func.isRequired,
  reloadData: PropTypes.func.isRequired,
  roles: PropTypes.array,
  empresaId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isSystemAdmin: PropTypes.bool,
};
