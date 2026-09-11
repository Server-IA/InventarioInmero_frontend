import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Chip,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useTheme, alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import axios from "../axiosConfig";
import MessageSnackBar from "../MessageSnackBar.jsx";
import FormEmpresaRol from "./FormEmpresaRol.jsx";
import ModalVerPermisos from "./ModalVerPermisos";
import SectionHeader from "../common/SectionHeader.jsx";
import GridActionBar from "../common/GridActionBar.jsx";
import AppDataGrid from "../common/AppDataGrid.jsx";

const SYSTEM_ROLE_REGEX = /(ROLE_ADMINISTRADOR_SISTEMA|ADMINISTRADOR[_\s-]*SISTEMA|ADMIN\s*SISTEMA)/i;

const parseRolesByCompany = () => {
  try {
    return JSON.parse(localStorage.getItem("rolesByCompany") || "[]");
  } catch {
    return [];
  }
};

const resolveCurrentRoleName = () => {
  const empresaId = Number(localStorage.getItem("empresaId"));
  const rolId = Number(localStorage.getItem("rolId"));
  const rolesByCompany = parseRolesByCompany();

  const byContext = rolesByCompany.find(
    (r) => Number(r?.empresaId) === empresaId && Number(r?.rolId) === rolId
  );

  return byContext?.rolNombre || localStorage.getItem("rolNombre") || "";
};

export default function EmpresaRol() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [selectedRow, setSelectedRow] = useState(null);
  const [rows, setRows] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [modalPermisosOpen, setModalPermisosOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);

  const [message, setMessage] = useState({
    open: false,
    severity: "success",
    text: "",
  });

  const empresaId = Number(localStorage.getItem("empresaId"));
  const currentRoleName = resolveCurrentRoleName();
  const isSystemAdmin = SYSTEM_ROLE_REGEX.test(currentRoleName);
  const permisosLegacyParams = (targetEmpresaId) =>
    isSystemAdmin ? { params: { empresaId: Number(targetEmpresaId) } } : undefined;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const reloadData = useCallback(async () => {
    try {
      setLoading(true);

      const resEmpresaRol = await axios.get(
        isSystemAdmin ? "/v1/system/empresa-rol" : "/v1/empresa-rol"
      );
      const empresaRoles = resEmpresaRol.data;

      const resRoles = await axios.get("/v1/items/rol/0");
      const rolesCatalogo = resRoles.data;

      let anyPermisoError = false;
      const enriched = await Promise.all(
        empresaRoles.map(async (empresaRol) => {
          const rolBase = rolesCatalogo.find((r) => r.name === empresaRol.rolNombre);

          if (!rolBase) {
            return { ...empresaRol, permisos: [], permisosError: false };
          }

          try {
            const permisosRes = await axios.get(
              `/v1/empresa-rol-permisos/rol/${rolBase.id}/permisos`,
              permisosLegacyParams(empresaRol.empresaId ?? empresaId)
            );

            return {
              ...empresaRol,
              permisos: permisosRes.data || [],
              permisosError: false,
            };
          } catch (err) {
            console.error(`Error consultando permisos para rol ${rolBase.name}:`, err);
            anyPermisoError = true;
            return {
              ...empresaRol,
              permisos: null,
              permisosError: true,
            };
          }
        })
      );

      setRows(enriched);
      if (anyPermisoError) {
        setMessage({
          open: true,
          severity: "error",
          text: t("empresaRol.messages.permissionsQueryError", "Error al consultar los permisos de uno o más roles. Puede reintentar la consulta."),
        });
      }
    } catch (error) {
      console.error(error);
      setRows([]);
      setMessage({
        open: true,
        severity: "error",
        text: t("empresaRol.messages.rolesLoadError", "Error al cargar roles de empresa."),
      });
    } finally {
      setLoading(false);
    }
  }, [empresaId, isSystemAdmin, t]);

  // CARGAR CATÁLOGO DE ROLES (solo para el formulario)
  const loadRoles = useCallback(async () => {
    try {
      const rolRes = await axios.get("/v1/items/rol/0");

      const list = Array.isArray(rolRes?.data)
        ? rolRes.data
        : Array.isArray(rolRes?.data?.content)
        ? rolRes.data.content
        : [];

      setRoles(list);
    } catch (err) {
      console.error("Error cargando roles catálogo:", err);
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    reloadData();
    loadRoles();
  }, [reloadData, loadRoles]);

  const handleCreate = () => {
    setSelectedRow(null);
    setFormOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedRow?.id) {
      return setMessage({
        open: true,
        severity: "warning",
        text: t("common.messages.selectRow"),
      });
    }
    setFormOpen(true);
  };

  const handleViewPermisos = () => {
    if (!selectedRow?.id) {
      return setMessage({
        open: true,
        severity: "warning",
        text: t("empresaRol.messages.selectRole"),
      });
    }
    setModalPermisosOpen(true);
  };

  const handleDeleteIntent = () => {
    if (!selectedRow?.id) {
      return setMessage({
        open: true,
        severity: "warning",
        text: t("common.messages.selectRow"),
      });
    }
    setConfirmOpen(true);
  };

  const confirmarEliminacion = async () => {
    try {
      setLoading(true);

      const resRoles = await axios.get("/v1/items/rol/0");
      const rolBase = resRoles.data.find((r) => r.name === selectedRow.rolNombre);

      if (!rolBase) throw new Error(t("empresaRol.messages.baseRoleNotFound"));

      const rolId = rolBase.id;

      const permisosRes = await axios.get(
        `/v1/empresa-rol-permisos/rol/${rolId}/permisos`,
        permisosLegacyParams(selectedRow?.empresaId ?? empresaId)
      );

      const permisos = permisosRes.data || [];
      const permisosIds = permisos.map((p) => p.id);

      if (permisosIds.length > 0) {
        await axios.delete(`/v1/empresa-rol-permisos/rol/${rolId}/permisos/quitar`, {
          data: { permisosId: permisosIds },
        });
      }

      await axios.delete(
        isSystemAdmin
          ? `/v1/system/empresa-rol/${selectedRow.id}`
          : `/v1/empresa-rol/${selectedRow.id}`
      );

      setMessage({
        open: true,
        severity: "success",
        text: t("empresaRol.messages.deleteSuccess"),
      });

      reloadData();
      setSelectedRow(null);
    } catch (error) {
      setMessage({
        open: true,
        severity: "error",
        text: t("empresaRol.messages.deleteError"),
      });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const columns = useMemo(
    () => {
      const baseColumns = [
        { field: "id", headerKey: "empresaRol.columns.id", width: 90, type: "number" },
      ];

      if (isSystemAdmin) {
        baseColumns.push({
          field: "empresaNombre",
          headerKey: "common.labels.company",
          type: "text",
          flex: 1.2,
          minWidth: 220,
        });
      }

      baseColumns.push(
        { field: "rolNombre", headerKey: "empresaRol.columns.role", type: "text", flex: 1, minWidth: 220 },
        {
          field: "permisos",
          headerKey: "empresaRol.columns.permissions",
          type: "custom",
          flex: 1.8,
          minWidth: 320,
          sortable: false,
          renderCell: (params) => {
            if (params.row.permisosError) {
              return (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "error.main",
                    fontStyle: "italic",
                    fontSize: "12px",
                  }}
                >
                  <span>{t("empresaRol.permissions.errorLoading", "Error al cargar permisos")}</span>
                  <Button
                    size="small"
                    variant="text"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      reloadData();
                    }}
                    sx={{
                      minWidth: "auto",
                      p: "2px 6px",
                      fontSize: "11px",
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                  >
                    {t("common.actions.retry", "Reintentar")}
                  </Button>
                </Box>
              );
            }
            const permisos = Array.isArray(params.row.permisos) ? params.row.permisos : [];
            if (permisos.length === 0) {
              return (
                <Box sx={{ color: "text.secondary", fontStyle: "italic" }}>
                  {t("empresaRol.permissions.withoutPermissions")}
                </Box>
              );
            }

            const visibles = permisos.slice(0, 3);
            return (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, py: 0.5 }}>
                {visibles.map((permiso) => (
                  <Chip
                    key={permiso.id}
                    label={permiso.nombre}
                    size="small"
                    sx={{
                      fontSize: "11px",
                      fontWeight: 500,
                      bgcolor: isDark
                        ? alpha(theme.palette.primary.light, 0.22)
                        : alpha(theme.palette.primary.main, 0.12),
                      color: isDark
                        ? theme.palette.primary.light
                        : theme.palette.primary.dark,
                      border: `1px solid ${
                        isDark ? alpha(theme.palette.primary.light, 0.4) : alpha(theme.palette.primary.main, 0.24)
                      }`,
                    }}
                  />
                ))}
                {permisos.length > 3 && (
                  <Box sx={{ fontSize: "11px", color: "text.secondary", alignSelf: "center" }}>
                    {t("common.labels.moreCount", { count: permisos.length - 3 })}
                  </Box>
                )}
              </Box>
            );
          },
        },
        {
          field: "estadoNombre",
          headerKey: "empresaRol.columns.status",
          type: "status",
          flex: 0.7,
          minWidth: 140,
          valueGetter: (params) =>
            params.row.estadoNombre ?? params.row.estado?.nombre ?? params.row.estadoId ?? "",
        }
      );

      return baseColumns;
    },
    [empresaId, isDark, isSystemAdmin, t, theme]
  );

  return (
    <Box p={2}>
      <SectionHeader
        title={isSystemAdmin ? t("empresaRol.systemTitle") : t("empresaRol.companyTitle")}
      />

      <MessageSnackBar message={message} setMessage={setMessage} />

      <GridActionBar
        onAdd={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDeleteIntent}
        canUpdate={Boolean(selectedRow)}
        canDelete={Boolean(selectedRow)}
        onFilters={() =>
          setMessage({
            open: true,
            severity: "info",
            text: t("common.messages.filtersComingSoon"),
          })
        }
        extraActions={
          <Button
            onClick={handleViewPermisos}
            startIcon={<VisibilityIcon />}
            disabled={!selectedRow}
          >
            {t("common.actions.viewPermissions")}
          </Button>
        }
      />

      <FormEmpresaRol
        open={formOpen}
        setOpen={setFormOpen}
        selectedRow={selectedRow}
        setSelectedRow={setSelectedRow}
        setMessage={setMessage}
        reloadData={reloadData}
        roles={roles}
        empresaId={empresaId}
        isSystemAdmin={isSystemAdmin}
      />

      <ModalVerPermisos
        open={modalPermisosOpen}
        onClose={() => setModalPermisosOpen(false)}
        permisos={selectedRow?.permisos || []}
        rolNombre={selectedRow?.rolNombre}
        permisosError={Boolean(selectedRow?.permisosError)}
        onRetry={reloadData}
      />

      <AppDataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        selectedRow={selectedRow}
        setSelectedRow={setSelectedRow}
        containerSx={{ borderRadius: 4 }}
        onEscape={() => {
          setFormOpen(false);
          setModalPermisosOpen(false);
          setConfirmOpen(false);
        }}
      />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t("empresaRol.confirmDelete.title")}</DialogTitle>
        <DialogContent>
          {t("empresaRol.confirmDelete.description")}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmarEliminacion}
          >
            {t("common.actions.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
