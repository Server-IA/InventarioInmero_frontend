/*=============================================================================
Nombre del archivo : kardex.jsx
Descripcion        : Vista principal del modulo de Kardex.
===============================================================================
CONTROL DE CAMBIOS
+------------+---------+----------------------+----------------------------------------------+
|   Fecha    | Version |      Autor           | Descripcion del cambio                       |
+------------+---------+----------------------+----------------------------------------------+
| 2026-09-11 | 0.4.0   | Cesar Medina         | Aplica estilo visual consistente a modales.  |
| 2026-09-11 | 0.4.0   | Cesar Medina         | Refuerza estilo visible del modal reportes.  |
+------------+---------+----------------------+----------------------------------------------+
=============================================================================*/
import React, { useState } from "react";
import MessageSnackBar from "../MessageSnackBar";
import GridKardex from "./GridKardex";
import ReKardex from "../RKardex/Rkardex";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useKardexAuth } from "./hooks/useKardexAuth";
import { useKardexData } from "./hooks/useKardexData";
import { useKardexFilters } from "./hooks/useKardexFilters";
import { KardexFormsContainer } from "./KardexFormsContainer";
import SectionHeader from "../common/SectionHeader";
import { DEFAULT_FILTERS } from "./constants/kardexConstants";

const getDialogUi = (theme) => {
  const isDark = theme.palette.mode === "dark";
  const darkGreen = isDark ? "#E7F6F7" : "#173f39";
  const green = isDark ? "#2b6b60" : "#173f39";
  const surface = isDark ? "#10211f" : theme.palette.common.white;
  const sectionSurface = isDark ? "#142b28" : "#f8fbfa";
  const subtleBorder = alpha(green, 0.14);
  const softShadow = `0 14px 36px ${alpha(darkGreen, isDark ? 0.18 : 0.08)}`;
  const buttonTransition = theme.transitions.create(
    ["transform", "background-color", "border-color", "box-shadow"],
    { duration: theme.transitions.duration.shorter }
  );

  return {
    paperSx: {
      borderRadius: 3,
      overflow: "hidden",
      backgroundColor: surface,
      boxShadow: softShadow,
    },
    titleSx: {
      px: { xs: 2.25, sm: 3 },
      py: 2.15,
      backgroundColor: surface,
      borderTop: `3px solid ${darkGreen}`,
      borderBottom: `1px solid ${subtleBorder}`,
      fontSize: "1.12rem",
      fontWeight: 700,
      color: darkGreen,
    },
    contentSx: {
      px: { xs: 2.25, sm: 3 },
      pt: 3,
      pb: 2.5,
      backgroundColor: surface,
    },
    actionsSx: {
      px: { xs: 2.25, sm: 3 },
      py: 2,
      backgroundColor: surface,
      borderTop: `1px solid ${subtleBorder}`,
      justifyContent: "space-between",
      gap: 1.25,
      flexWrap: "wrap",
    },
    bodyCardSx: {
      p: { xs: 1.5, sm: 2 },
      borderRadius: 2.25,
      border: `1px solid ${subtleBorder}`,
      backgroundColor: sectionSurface,
      boxShadow: `0 4px 14px ${alpha(darkGreen, isDark ? 0.14 : 0.05)}`,
    },
    secondaryButtonSx: {
      textTransform: "none",
      fontWeight: 700,
      borderRadius: 1.75,
      color: darkGreen,
      borderColor: alpha(darkGreen, 0.18),
      transition: buttonTransition,
      "&:hover": {
        borderColor: alpha(darkGreen, 0.26),
        backgroundColor: alpha(darkGreen, 0.06),
        boxShadow: `0 8px 20px ${alpha(darkGreen, isDark ? 0.14 : 0.08)}`,
        transform: "translateY(-1px)",
      },
      "&:active": {
        transform: "translateY(1px) scale(0.99)",
        boxShadow: `0 3px 10px ${alpha(darkGreen, isDark ? 0.16 : 0.09)}`,
      },
    },
    subtleButtonSx: {
      textTransform: "none",
      fontWeight: 700,
      borderRadius: 1.75,
      color: darkGreen,
      transition: buttonTransition,
      "&:hover": {
        backgroundColor: alpha(darkGreen, 0.06),
        transform: "translateY(-1px)",
      },
      "&:active": {
        transform: "translateY(1px) scale(0.99)",
      },
    },
    primaryButtonSx: {
      textTransform: "none",
      fontWeight: 700,
      borderRadius: 1.75,
      boxShadow: `0 10px 22px ${alpha(green, isDark ? 0.26 : 0.16)}`,
      transition: buttonTransition,
      "&:hover": {
        boxShadow: `0 14px 28px ${alpha(green, isDark ? 0.32 : 0.22)}`,
        transform: "translateY(-1px)",
      },
      "&:active": {
        transform: "translateY(1px) scale(0.99)",
        boxShadow: `0 5px 12px ${alpha(green, isDark ? 0.24 : 0.14)}`,
      },
    },
  };
};

export default function Kardex() {
  const theme = useTheme();
  const dialogUi = getDialogUi(theme);
  const { isAdmin } = useKardexAuth();
  const { kardexesRaw, catalogs, reloadData, loading } = useKardexData();

  const [kardexPage, setKardexPage] = useState({ page: 0, size: 10 });
  const { filters, setFilters, paginatedRows, totalFiltered } = useKardexFilters(
    kardexesRaw,
    kardexPage,
    catalogs.tiposMovimiento
  );

  const [selectedRow, setSelectedRow] = useState(null);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [message, setMessage] = useState({ open: false, severity: "success", text: "" });

  const hasActiveFilters = Boolean(
    filters.fechaDesde || filters.fechaHasta || filters.tipoMovimientoId || filters.estadoId
  );

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setKardexPage((prev) => ({ ...prev, page: 0 }));
  };

  return (
    <Box sx={{ p: 2 }}>
      <SectionHeader title="Gestión de Kardex" />

      <KardexFormsContainer
        selectedRow={selectedRow}
        setSelectedRow={setSelectedRow}
        reloadData={reloadData}
        setMessage={setMessage}
        onOpenReportes={() => setSearchDialogOpen(true)}
        onOpenFilters={() => setFiltersOpen(true)}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <GridKardex
        kardexes={paginatedRows}
        selectedRow={selectedRow}
        setSelectedRow={setSelectedRow}
        loading={loading}
        rowCount={totalFiltered}
        paginationModel={kardexPage}
        setPaginationModel={setKardexPage}
        isAdmin={isAdmin}
      />

      <Dialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: dialogUi.paperSx }}
      >
        <DialogTitle sx={dialogUi.titleSx}>Filtros de Kardex</DialogTitle>
        <DialogContent sx={dialogUi.contentSx}>
          <Box sx={{ ...dialogUi.bodyCardSx, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 1 }}>
            <TextField
              size="small"
              label="Fecha desde"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filters.fechaDesde}
              onChange={(e) => setFilters((prev) => ({ ...prev, fechaDesde: e.target.value }))}
            />
            <TextField
              size="small"
              label="Fecha hasta"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filters.fechaHasta}
              onChange={(e) => setFilters((prev) => ({ ...prev, fechaHasta: e.target.value }))}
            />
            <TextField
              size="small"
              select
              label="Tipo movimiento"
              value={filters.tipoMovimientoId}
              onChange={(e) => setFilters((prev) => ({ ...prev, tipoMovimientoId: e.target.value }))}
            >
              <MenuItem value="">Todos</MenuItem>
              {(catalogs.tiposMovimiento || []).map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name || t.nombre}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label="Estado"
              value={filters.estadoId}
              onChange={(e) => setFilters((prev) => ({ ...prev, estadoId: e.target.value }))}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="1">Activo</MenuItem>
              <MenuItem value="0">Inactivo</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={dialogUi.actionsSx}>
          <Button onClick={handleClearFilters} sx={dialogUi.subtleButtonSx}>
            Limpiar
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            sx={dialogUi.primaryButtonSx}
            onClick={() => {
              setKardexPage((prev) => ({ ...prev, page: 0 }));
              setFiltersOpen(false);
            }}
          >
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: dialogUi.paperSx }}
      >
        <DialogTitle sx={dialogUi.titleSx}>Reportes de Kardex</DialogTitle>
        <DialogContent sx={dialogUi.contentSx}>
          <Box sx={{ ...dialogUi.bodyCardSx, p: { xs: 1.25, sm: 1.5 } }}>
            <ReKardex setOpen={setSearchDialogOpen} embeddedInDialog />
          </Box>
        </DialogContent>
        <DialogActions sx={dialogUi.actionsSx}>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={() => setSearchDialogOpen(false)} sx={dialogUi.secondaryButtonSx}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <MessageSnackBar message={message} setMessage={setMessage} />
    </Box>
  );
}
