/*=============================================================================
 Nombre del archivo : PaisModal.jsx
 Descripcion        : Modal para crear o actualizar un País.
===============================================================================
 CONTROL DE CAMBIOS
 +------------+---------+----------------------+-----------------------------+
 |   Fecha    | Versión |      Autor           | Descripción del cambio      |
 +------------+---------+----------------------+-----------------------------+
 | 2026-05-23 | 1.0.0   | Jeisson Sanchez      | Creación del archivo.       |
 | 2026-06-06 | 0.4.0   | Jeisson Sanchez      | Ajuste i18n y estilos.      |
 | 2026-08-25 | 0.4.0   | Jeisson Sanchez      | [Issue #273] Conectar a backend y PropTypes |
 +------------+---------+----------------------+-----------------------------+
=============================================================================*/

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";

export default function PaisModal({ open, onClose, onSave, paisToEdit }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    acronimo: "",
  });

  useEffect(() => {
    if (!open) return;
    setFormData(
      paisToEdit
        ? {
            nombre: paisToEdit.nombre || "",
            codigo: paisToEdit.codigo || "",
            acronimo: paisToEdit.acronimo || "",
          }
        : { nombre: "", codigo: "", acronimo: "" },
    );
  }, [open, paisToEdit]);

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {paisToEdit
          ? t("localizacionGeografica.forms.countryUpdate")
          : t("localizacionGeografica.forms.countryCreate")}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label={t("localizacionGeografica.forms.fields.name")}
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            fullWidth
            size="small"
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label={t("localizacionGeografica.forms.fields.code")}
              name="codigo"
              value={formData.codigo}
              onChange={handleChange}
              fullWidth
              size="small"
            />
            <TextField
              label={t("localizacionGeografica.forms.fields.acronym")}
              name="acronimo"
              value={formData.acronimo}
              onChange={handleChange}
              fullWidth
              size="small"
              inputProps={{ maxLength: 3 }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.actions.cancel")}</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!formData.nombre || !formData.codigo || !formData.acronimo}
        >
          {t("common.actions.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

PaisModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  paisToEdit: PropTypes.object,
};
