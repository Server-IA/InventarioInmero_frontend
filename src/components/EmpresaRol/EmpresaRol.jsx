import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [filters, setFilters] = useState({
    empresaId: "",
    rolId: "",
    estadoId: "",
  });
  const [tempFilters, setTempFilters] = useState(filters);

  const loadEmpresas = useCallback(async () => {
    if (!isSystemAdmin) return;
    try {
      const res = await axios.get("/v1/items/empresa/0");
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.content)
        ? res.data.content
        : [];
      setEmpresas(list);
    } catch (err) {
      console.error("Error cargando empresas:", err);
      setEmpresas([]);
    }
  }, [isSystemAdmin]);

  const reloadData = useCallback(async () => {
    try {
      setLoading(true);

      const resEmpresaRol = await axios.get(
        isSystemAdmin ? "/v1/system/empresa-rol" : "/v1/empresa-rol"
      );
      const empresaRoles = resEmpresaRol.data;

      const resRoles = await axios.get("/v1/items/rol/0");
      const rolesCatalogo = resRoles.data;

      const enriched = await Promise.all(
        empresaRoles.map(async (empresaRol) => {
          const rolBase = rolesCatalogo.find((r) => r.name === empresaRol.rolNombre);

          if (!rolBase) {
            return { ...empresaRol, permisos: [] };
          }

          try {
            const permisosRes = await axios.get(
              `/v1/empresa-rol-permisos/rol/${rolBase.id}/permisos`,
              permisosLegacyParams(empresaRol.empresaId ?? empresaId)
            );

            return {
              ...empresaRol,
              permisos: permisosRes.data || [],
            };
          } catch {
            return {
              ...empresaRol,
              permisos: [],
            };
          }
        })
      );

      setRows(enriched);
    } catch (error) {
      console.error(error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId, isSystemAdmin]);

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
    loadEmpresas();
  }, [reloadData, loadRoles, loadEmpresas]);

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

  const handleOpenFilters = () => {
    setTempFilters(filters);
    setFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    const emptyFilters = { empresaId: "", rolId: "", estadoId: "" };
    setTempFilters(emptyFilters);
    setFilters(emptyFilters);
    setFilterModalOpen(false);
  };

  const hasActiveFilters = Boolean(filters.empresaId || filters.rolId || filters.estadoId);

  // Determinar la empresa efectiva seleccionada en el modal (o la empresa de sesión si no es admin sistema)
  const effectiveFilterEmpresaId = isSystemAdmin ? tempFilters.empresaId : empresaId;

  // Opciones de roles disponibles en el modal según empresa seleccionada (híbrido/cascada)
  const availableFilterRoles = useMemo(() => {
    if (effectiveFilterEmpresaId) {
      // Filtrar a partir de las filas ya cargadas para esa empresa
      const rowsForCompany = rows.filter(
        (r) => String(r.empresaId ?? empresaId) === String(effectiveFilterEmpresaId)
      );
      const uniqueRoleNames = Array.from(
        new Set(rowsForCompany.map((r) => r.rolNombre).filter(Boolean))
      );
      return uniqueRoleNames.map((roleName) => {
        const found = roles.find((r) => r.name === roleName);
        return {
          id: found ? String(found.id) : roleName,
          name: roleName,
        };
      });
    }

    // Sin empresa seleccionada (Admin Sistema viendo todo): catálogo global completo
    return roles.map((r) => ({
      id: String(r.id),
      name: r.name || r.nombre,
    }));
  }, [effectiveFilterEmpresaId, rows, empresaId, roles]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filters.empresaId && String(row.empresaId ?? empresaId) !== String(filters.empresaId)) {
        return false;
      }
      if (filters.rolId) {
        const selectedRol = roles.find((r) => String(r.id) === String(filters.rolId));
        const targetName = selectedRol ? selectedRol.name : filters.rolId;
        if (row.rolNombre !== targetName) {
          return false;
        }
      }
      if (filters.estadoId) {
        const rowEstadoId = row.estadoId ?? row.estado?.id;
        const rowEstadoNombre = (row.estadoNombre ?? row.estado?.nombre ?? "").toLowerCase();
        if (filters.estadoId === "1" && rowEstadoId !== 1 && rowEstadoNombre !== "activo") {
          return false;
        }
        if (filters.estadoId === "2" && rowEstadoId !== 2 && rowEstadoNombre !== "inactivo") {
          return false;
        }
      }
      return true;
    });
  }, [rows, filters, roles, empresaId]);

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
        onFilters={handleOpenFilters}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
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
      />

      <AppDataGrid
        rows={filteredRows}
        columns={columns}
        loading={loading}
        selectedRow={selectedRow}
        setSelectedRow={setSelectedRow}
        containerSx={{ borderRadius: 4 }}
        onEscape={() => {
          setFormOpen(false);
          setModalPermisosOpen(false);
          setConfirmOpen(false);
          setFilterModalOpen(false);
        }}
      />

      <Dialog
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("common.actions.filters", "Filtros")}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gridTemplateColumns: isSystemAdmin ? "1fr 1fr" : "1fr", gap: 2, mt: 1 }}>
            {isSystemAdmin && (
              <FormControl fullWidth size="small">
                <InputLabel id="empresa-filter-label">
                  {t("common.labels.company", "Empresa")}
                </InputLabel>
                <Select
                  labelId="empresa-filter-label"
                  value={tempFilters.empresaId}
                  label={t("common.labels.company", "Empresa")}
                  onChange={(e) => {
                    const newEmpresaId = e.target.value;
                    setTempFilters((prev) => {
                      // Al cambiar empresa, resetear rolId si ya no existe en la nueva empresa
                      return {
                        ...prev,
                        empresaId: newEmpresaId,
                        rolId: "",
                      };
                    });
                  }}
                >
                  <MenuItem value="">
                    <em>{t("common.labels.all", "Todos")}</em>
                  </MenuItem>
                  {empresas.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.nombre || emp.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth size="small">
              <InputLabel id="rol-filter-label">
                {t("empresaRol.columns.role", "Rol")}
              </InputLabel>
              <Select
                labelId="rol-filter-label"
                value={tempFilters.rolId}
                label={t("empresaRol.columns.role", "Rol")}
                onChange={(e) =>
                  setTempFilters((prev) => ({ ...prev, rolId: e.target.value }))
                }
              >
                <MenuItem value="">
                  <em>{t("common.labels.all", "Todos")}</em>
                </MenuItem>
                {availableFilterRoles.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="estado-filter-label">
                {t("empresaRol.columns.status", "Estado")}
              </InputLabel>
              <Select
                labelId="estado-filter-label"
                value={tempFilters.estadoId}
                label={t("empresaRol.columns.status", "Estado")}
                onChange={(e) =>
                  setTempFilters((prev) => ({ ...prev, estadoId: e.target.value }))
                }
              >
                <MenuItem value="">
                  <em>{t("common.labels.all", "Todos")}</em>
                </MenuItem>
                <MenuItem value="1">{t("common.labels.active", "Activo")}</MenuItem>
                <MenuItem value="2">{t("common.labels.inactive", "Inactivo")}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClearFilters}>
            {t("common.actions.clear", "Limpiar")}
          </Button>
          <Button variant="contained" onClick={handleApplyFilters}>
            {t("common.actions.apply", "Aplicar")}
          </Button>
        </DialogActions>
      </Dialog>

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
