/*=============================================================================
 Nombre del archivo : ConfirmInactivateModal.jsx
 Descripcion        : Modal de confirmación para inactivar o activar un registro geográfico.
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

import React from "react";
import PropTypes from "prop-types";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

export default function ConfirmInactivateModal({
  open,
  onClose,
  onConfirm,
  title,
  itemName,
  isActivating = false,
  impactMessage = [],
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const actionLabel = isActivating
    ? t("localizacionGeografica.actions.activate").toLowerCase()
    : t("localizacionGeografica.actions.inactivate").toLowerCase();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title || itemName}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" align="center" sx={{ mb: 2 }}>
          {t("localizacionGeografica.confirm.message", { action: actionLabel })}
        </Typography>
        {!isActivating && impactMessage?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {t("localizacionGeografica.confirm.impactIntro")}
            </Typography>
            <Box
              sx={{
                border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                borderRadius: 1,
                p: 2,
                bgcolor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.12 : 0.06),
              }}
            >
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {impactMessage.map((message) => (
                  <li key={message}>
                    <Typography variant="body2">{message}</Typography>
                  </li>
                ))}
              </ul>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {t("localizacionGeografica.confirm.notShown")}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.actions.cancel")}</Button>
        <Button onClick={onConfirm} variant="contained" color={isActivating ? "primary" : "error"}>
          {isActivating
            ? t("localizacionGeografica.actions.activate")
            : t("localizacionGeografica.actions.inactivate")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ConfirmInactivateModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  itemName: PropTypes.string,
  isActivating: PropTypes.bool,
  impactMessage: PropTypes.array,
};
