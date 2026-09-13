/*=============================================================================
 Nombre del archivo : FiltroModal.jsx
 Descripcion        : Modal para filtrar registros por código, nombre, acrónimo y estado.
===============================================================================
 CONTROL DE CAMBIOS
 +------------+---------+----------------------+-----------------------------+
 |   Fecha    | Versión |      Autor           | Descripción del cambio      |
 +------------+---------+----------------------+-----------------------------+
 | 2026-05-23 | 1.0.0   | Jeisson Sanchez      | Creación del archivo.       |
 | 2026-06-06 | 0.4.0   | Jeisson Sanchez      | Ajuste i18n y estilos.      |
 | 2026-08-25 | 0.4.0   | Jeisson Sanchez      | [Issue #273] Agregar PropTypes |
 +------------+---------+----------------------+-----------------------------+
=============================================================================*/

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";

const ALL_STATUS = "Todos";
const ACTIVE_STATUS = "Activo";
const INACTIVE_STATUS = "Inactivo";

export default function FiltroModal({ open, onClose, onFilter, currentFilters }) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    nombre: "",
    codigo: "",
    acronimo: "",
    estado: ALL_STATUS,
  });

  useEffect(() => {
    if (!open) return;
    setFilters(currentFilters || {
      nombre: "",
      codigo: "",
      acronimo: "",
      estado: ALL_STATUS,
    });
  }, [open, currentFilters]);

  const handleChange = (event) => {
    setFilters((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleFilter = () => {
    onFilter(filters);
    onClose();
  };

  const handleClear = () => {
    const cleared = { nombre: "", codigo: "", acronimo: "", estado: ALL_STATUS };
    setFilters(cleared);
    onFilter(cleared);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("localizacionGeografica.forms.filterTitle")}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label={t("localizacionGeografica.forms.fields.name")}
            name="nombre"
            value={filters.nombre}
            onChange={handleChange}
            fullWidth
            size="small"
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("localizacionGeografica.forms.fields.code")}
              name="codigo"
              value={filters.codigo}
              onChange={handleChange}
              fullWidth
              size="small"
            />
            <TextField
              label={t("localizacionGeografica.forms.fields.acronym")}
              name="acronimo"
              value={filters.acronimo}
              onChange={handleChange}
              fullWidth
              size="small"
            />
            <TextField
              select
              label={t("localizacionGeografica.forms.fields.status")}
              name="estado"
              value={filters.estado}
              onChange={handleChange}
              fullWidth
              size="small"
            >
              <MenuItem value={ALL_STATUS}>{t("common.labels.all")}</MenuItem>
              <MenuItem value={ACTIVE_STATUS}>{t("common.labels.active")}</MenuItem>
              <MenuItem value={INACTIVE_STATUS}>{t("common.labels.inactive")}</MenuItem>
            </TextField>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClear}>{t("common.actions.clear")}</Button>
        <Button onClick={handleFilter} variant="contained">
          {t("common.actions.apply")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

FiltroModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onFilter: PropTypes.func.isRequired,
  currentFilters: PropTypes.object,
};
