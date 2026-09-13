/*=============================================================================
 Nombre del archivo : MunicipiosListModal.jsx
 Descripcion        : Modal que lista los municipios de un departamento.
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

import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import AppDataGrid from "../common/AppDataGrid.jsx";
import GridActionBar from "../common/GridActionBar.jsx";

const INACTIVE_STATUS = "Inactivo";

export default function MunicipiosListModal({
  open,
  onClose,
  paisContext,
  deptoContext,
  municipios = [],
  onAdd,
  onEdit,
  onInactivate,
  onOpenFilter,
}) {
  const { t } = useTranslation();
  const [selectedMunicipio, setSelectedMunicipio] = useState(null);

  const munColumns = useMemo(() => [
    { field: "codigo", headerKey: "localizacionGeografica.columns.code", flex: 1, minWidth: 100 },
    { field: "nombre", headerKey: "localizacionGeografica.columns.name", flex: 2, minWidth: 200 },
    { field: "acronimo", headerKey: "localizacionGeografica.columns.acronym", flex: 1, minWidth: 100 },
    { field: "estado", headerKey: "localizacionGeografica.columns.status", type: "status", flex: 1, minWidth: 100 },
  ], []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Typography variant="h6">
            {t("localizacionGeografica.forms.municipalitiesTitle", {
              country: paisContext?.nombre ?? "",
              department: deptoContext?.nombre ?? "",
            })}
          </Typography>
          <IconButton onClick={onClose} aria-label={t("common.actions.close")}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <GridActionBar
          onAdd={onAdd}
          onUpdate={() => onEdit(selectedMunicipio)}
          onDelete={() => onInactivate(selectedMunicipio)}
          canUpdate={Boolean(selectedMunicipio)}
          canDelete={Boolean(selectedMunicipio)}
          onFilters={onOpenFilter}
          labels={{
            delete: selectedMunicipio?.estado === INACTIVE_STATUS
              ? t("localizacionGeografica.actions.activate")
              : t("localizacionGeografica.actions.inactivate"),
          }}
        />

        <AppDataGrid
          rows={municipios}
          columns={munColumns}
          selectedRow={selectedMunicipio}
          setSelectedRow={(row) => setSelectedMunicipio(row || null)}
          containerSx={{ maxHeight: 400, borderRadius: 4 }}
        />
      </DialogContent>
    </Dialog>
  );
}

MunicipiosListModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  paisContext: PropTypes.object,
  deptoContext: PropTypes.object,
  municipios: PropTypes.array,
  onAdd: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onInactivate: PropTypes.func.isRequired,
  onOpenFilter: PropTypes.func.isRequired,
};
