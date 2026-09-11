import React from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Box,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTheme, alpha } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

export default function ModalVerPermisos({
  open,
  onClose,
  permisos = [],
  rolNombre = "",
  permisosError = false,
  onRetry = null,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Agrupar por módulo usando autoridad
  const permisosPorModulo = (Array.isArray(permisos) ? permisos : []).reduce((acc, permiso) => {
    let moduloNombre = t("common.labels.general");

    if (permiso.autoridad) {
      moduloNombre = permiso.autoridad.split("_")[0];
      moduloNombre =
        moduloNombre.charAt(0) +
        moduloNombre.slice(1).toLowerCase();
    }

    if (!acc[moduloNombre]) {
      acc[moduloNombre] = [];
    }

    acc[moduloNombre].push(permiso);
    return acc;
  }, {});

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          fontWeight: 600,
          backgroundColor: alpha(theme.palette.primary.main, isDark ? 0.15 : 0.08),
        }}
      >
        {t("empresaRol.permissions.rolePermissionsTitle", { role: rolNombre })}
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          maxHeight: 500,
          overflowY: "auto",
          backgroundColor: theme.palette.background.default,
        }}
      >
        {permisosError ? (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Typography color="error" sx={{ mb: 2 }}>
              {t("empresaRol.permissions.rolePermissionsError", "No se pudieron cargar los permisos debido a un error de conexión o del servidor.")}
            </Typography>
            {onRetry && (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  onClose();
                  onRetry();
                }}
              >
                {t("common.actions.retry", "Reintentar")}
              </Button>
            )}
          </Box>
        ) : permisos.length === 0 ? (
          <Typography color="text.secondary">
            {t("empresaRol.permissions.roleHasNoPermissions")}
          </Typography>
        ) : (
          Object.entries(permisosPorModulo).map(
            ([moduloNombre, listaPermisos]) => (
              <Accordion
                key={moduloNombre}
                disableGutters
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(
                    theme.palette.primary.main,
                    isDark ? 0.08 : 0.04
                  ),
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    "& .MuiAccordionSummary-content": {
                      alignItems: "center",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <Typography fontWeight={600}>
                      {moduloNombre}
                    </Typography>

                    <Chip
                      size="small"
                      label={t("common.labels.permissionsCount", { count: listaPermisos.length })}
                      sx={{
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          isDark ? 0.25 : 0.15
                        ),
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </AccordionSummary>

                <AccordionDetails>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {listaPermisos.map((permiso) => (
                      <Chip
                        key={permiso.id}
                        label={permiso.nombre}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )
          )
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t("common.actions.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ModalVerPermisos.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  permisos: PropTypes.array,
  rolNombre: PropTypes.string,
  permisosError: PropTypes.bool,
  onRetry: PropTypes.func,
};
