/*=============================================================================
 Nombre del archivo : LocalizacionGeografica.jsx
 Descripcion        : Módulo principal unificado para Gestión de Localización Geográfica.
===============================================================================
 CONTROL DE CAMBIOS
 +------------+---------+----------------------+-----------------------------+
 |   Fecha    | Versión |      Autor           | Descripción del cambio      |
 +------------+---------+----------------------+-----------------------------+
 | 2026-05-23 | 1.0.0   | Jeisson Sanchez      | Creación del archivo.       |
 | 2026-06-06 | 0.4.0   | Jeisson Sanchez      | Ajuste i18n y estilos.      |
 | 2026-08-25 | 0.4.0   | Jeisson Sanchez      | [Issue #273] Conectar modulo a endpoints reales de backend |
 +------------+---------+----------------------+-----------------------------+
=============================================================================*/

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Button, MenuItem, Select, Tooltip } from "@mui/material";
import { Add, Check, Close, Edit } from "@mui/icons-material";
import { alpha, useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import axios from "../axiosConfig";
import MessageSnackBar from "../MessageSnackBar.jsx";

import AppDataGrid from "../common/AppDataGrid.jsx";
import GridActionBar from "../common/GridActionBar.jsx";
import SectionHeader from "../common/SectionHeader.jsx";
import ConfirmInactivateModal from "./ConfirmInactivateModal";
import DepartamentoModal from "./DepartamentoModal";
import FiltroModal from "./FiltroModal";
import MunicipioModal from "./MunicipioModal";
import MunicipiosListModal from "./MunicipiosListModal";
import PaisModal from "./PaisModal";

const ACTIVE_STATUS = "Activo";
const INACTIVE_STATUS = "Inactivo";
const ALL_STATUS = "Todos";

export default function LocalizacionGeografica() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isDark = theme.palette.mode === "dark";
  const [paises, setPaises] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [selectedPaisId, setSelectedPaisId] = useState("");
  const [selectedDeptoId, setSelectedDeptoId] = useState(null);
  const [deptoFilters, setDeptoFilters] = useState(null);
  const [munFilters, setMunFilters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    open: false,
    severity: "success",
    text: "",
  });

  const [modalState, setModalState] = useState({
    pais: false,
    depto: false,
    municipioList: false,
    municipioForm: false,
    filtroDepto: false,
    filtroMun: false,
    confirm: false,
  });
  const [actionContext, setActionContext] = useState({
    type: null,
    item: null,
    isActivating: false,
  });

  const loadPaises = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("/v1/pais");
      const list = Array.isArray(res.data) ? res.data : [];
      const mapped = list.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        codigo: String(p.codigo ?? ""),
        acronimo: p.acronimo ?? "",
        estadoId: p.estadoId,
        estado: p.estadoId === 1 ? ACTIVE_STATUS : INACTIVE_STATUS,
      }));
      setPaises(mapped);
      setSelectedPaisId((prev) => {
        if (prev && mapped.some((p) => p.id === prev)) return prev;
        return mapped[0]?.id || "";
      });
    } catch (err) {
      console.error("Error cargando paises:", err);
      setMessage({
        open: true,
        severity: "error",
        text: err.response?.data?.detail || err.response?.data?.message || t("localizacionGeografica.messages.loadError", "Error al cargar países"),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadDepartamentos = useCallback(async (paisId) => {
    if (!paisId) {
      setDepartamentos([]);
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`/v1/departamento?paisId=${paisId}`);
      const list = Array.isArray(res.data) ? res.data : [];
      const mapped = list.map((d) => ({
        id: d.id,
        paisId: d.paisId,
        nombre: d.nombre,
        codigo: String(d.codigo ?? ""),
        acronimo: d.acronimo ?? "",
        estadoId: d.estadoId,
        estado: d.estadoId === 1 ? ACTIVE_STATUS : INACTIVE_STATUS,
      }));
      setDepartamentos(mapped);
    } catch (err) {
      console.error("Error cargando departamentos:", err);
      setDepartamentos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMunicipios = useCallback(async (deptoId) => {
    if (!deptoId) {
      setMunicipios([]);
      return;
    }
    try {
      const res = await axios.get(`/v1/municipio?departamentoId=${deptoId}`);
      const list = Array.isArray(res.data) ? res.data : [];
      const mapped = list.map((m) => ({
        id: m.id,
        departamentoId: m.departamentoId,
        nombre: m.nombre,
        codigo: String(m.codigo ?? ""),
        acronimo: m.acronimo ?? "",
        estadoId: m.estadoId,
        estado: m.estadoId === 1 ? ACTIVE_STATUS : INACTIVE_STATUS,
      }));
      setMunicipios(mapped);
    } catch (err) {
      console.error("Error cargando municipios:", err);
      setMunicipios([]);
    }
  }, []);

  useEffect(() => {
    loadPaises();
  }, [loadPaises]);

  useEffect(() => {
    if (selectedPaisId) {
      loadDepartamentos(selectedPaisId);
    } else {
      setDepartamentos([]);
    }
  }, [selectedPaisId, loadDepartamentos]);

  useEffect(() => {
    if (selectedDeptoId) {
      loadMunicipios(selectedDeptoId);
    } else {
      setMunicipios([]);
    }
  }, [selectedDeptoId, loadMunicipios]);

  const selectedPais = paises.find((pais) => pais.id === selectedPaisId);
  const selectedDepto = departamentos.find((depto) => depto.id === selectedDeptoId);

  const deptosByPais = useMemo(() => {
    let list = departamentos.filter((depto) => depto.paisId === selectedPaisId);
    if (deptoFilters) {
      if (deptoFilters.nombre) {
        list = list.filter((depto) => depto.nombre.toLowerCase().includes(deptoFilters.nombre.toLowerCase()));
      }
      if (deptoFilters.codigo) list = list.filter((depto) => depto.codigo.includes(deptoFilters.codigo));
      if (deptoFilters.acronimo) {
        list = list.filter((depto) => depto.acronimo.toLowerCase().includes(deptoFilters.acronimo.toLowerCase()));
      }
      if (deptoFilters.estado !== ALL_STATUS) list = list.filter((depto) => depto.estado === deptoFilters.estado);
    }
    return list;
  }, [departamentos, selectedPaisId, deptoFilters]);

  const municipiosByDepto = useMemo(() => {
    if (!selectedDeptoId) return [];
    let list = municipios.filter((municipio) => municipio.departamentoId === selectedDeptoId);
    if (munFilters) {
      if (munFilters.nombre) {
        list = list.filter((municipio) => municipio.nombre.toLowerCase().includes(munFilters.nombre.toLowerCase()));
      }
      if (munFilters.codigo) list = list.filter((municipio) => municipio.codigo.includes(munFilters.codigo));
      if (munFilters.acronimo) {
        list = list.filter((municipio) => municipio.acronimo.toLowerCase().includes(munFilters.acronimo.toLowerCase()));
      }
      if (munFilters.estado !== ALL_STATUS) list = list.filter((municipio) => municipio.estado === munFilters.estado);
    }
    return list;
  }, [municipios, selectedDeptoId, munFilters]);

  const openModal = (name, context = {}) => {
    setActionContext((prev) => ({ ...prev, ...context }));
    setModalState((prev) => ({ ...prev, [name]: true }));
  };

  const closeModal = (name) => {
    setModalState((prev) => ({ ...prev, [name]: false }));
  };

  const handleSavePais = async (data) => {
    try {
      const payload = {
        nombre: data.nombre,
        codigo: Number(data.codigo),
        acronimo: (data.acronimo || "").toUpperCase(),
        estadoId: 1,
      };
      if (actionContext.item) {
        payload.id = actionContext.item.id;
        payload.estadoId = actionContext.item.estadoId ?? 1;
        await axios.put(`/v1/pais/${actionContext.item.id}`, payload);
      } else {
        await axios.post("/v1/pais", payload);
      }
      setMessage({
        open: true,
        severity: "success",
        text: actionContext.item
          ? t("localizacionGeografica.messages.paisUpdated", "País actualizado con éxito")
          : t("localizacionGeografica.messages.paisCreated", "País creado con éxito"),
      });
      await loadPaises();
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setMessage({
        open: true,
        severity: "error",
        text: `${t("localizacionGeografica.messages.saveError", "Error al guardar país:")} ${detail}`,
      });
    }
  };

  const handleSaveDepto = async (data) => {
    try {
      const payload = {
        paisId: Number(selectedPaisId),
        nombre: data.nombre,
        codigo: Number(data.codigo),
        acronimo: (data.acronimo || "").toUpperCase(),
        estadoId: 1,
      };
      if (actionContext.item) {
        payload.id = actionContext.item.id;
        payload.estadoId = actionContext.item.estadoId ?? 1;
        await axios.put(`/v1/departamento/${actionContext.item.id}`, payload);
      } else {
        await axios.post("/v1/departamento", payload);
      }
      setMessage({
        open: true,
        severity: "success",
        text: actionContext.item
          ? t("localizacionGeografica.messages.deptoUpdated", "Departamento actualizado con éxito")
          : t("localizacionGeografica.messages.deptoCreated", "Departamento creado con éxito"),
      });
      await loadDepartamentos(selectedPaisId);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setMessage({
        open: true,
        severity: "error",
        text: `${t("localizacionGeografica.messages.saveError", "Error al guardar departamento:")} ${detail}`,
      });
    }
  };

  const handleSaveMunicipio = async (data) => {
    try {
      const payload = {
        departamentoId: Number(selectedDeptoId),
        nombre: data.nombre,
        codigo: Number(data.codigo),
        acronimo: (data.acronimo || "").toUpperCase(),
        estadoId: 1,
      };
      if (actionContext.item) {
        payload.id = actionContext.item.id;
        payload.estadoId = actionContext.item.estadoId ?? 1;
        await axios.put(`/v1/municipio/${actionContext.item.id}`, payload);
      } else {
        await axios.post("/v1/municipio", payload);
      }
      setMessage({
        open: true,
        severity: "success",
        text: actionContext.item
          ? t("localizacionGeografica.messages.municipioUpdated", "Municipio actualizado con éxito")
          : t("localizacionGeografica.messages.municipioCreated", "Municipio creado con éxito"),
      });
      await loadMunicipios(selectedDeptoId);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setMessage({
        open: true,
        severity: "error",
        text: `${t("localizacionGeografica.messages.saveError", "Error al guardar municipio:")} ${detail}`,
      });
    }
  };

  const handleConfirmAction = async () => {
    const { type, item, isActivating } = actionContext;
    if (!item) return;

    try {
      if (type === "pais") {
        if (isActivating) {
          await axios.put(`/v1/pais/${item.id}`, {
            id: item.id,
            nombre: item.nombre,
            codigo: Number(item.codigo),
            acronimo: item.acronimo,
            estadoId: 1,
          });
        } else {
          await axios.delete(`/v1/pais/${item.id}`);
        }
        await loadPaises();
        if (selectedPaisId) await loadDepartamentos(selectedPaisId);
      } else if (type === "depto") {
        if (isActivating) {
          await axios.put(`/v1/departamento/${item.id}`, {
            id: item.id,
            paisId: selectedPaisId,
            nombre: item.nombre,
            codigo: Number(item.codigo),
            acronimo: item.acronimo,
            estadoId: 1,
          });
        } else {
          await axios.delete(`/v1/departamento/${item.id}`);
        }
        await loadDepartamentos(selectedPaisId);
        if (selectedDeptoId) await loadMunicipios(selectedDeptoId);
      } else if (type === "municipio") {
        if (isActivating) {
          await axios.put(`/v1/municipio/${item.id}`, {
            id: item.id,
            departamentoId: selectedDeptoId,
            nombre: item.nombre,
            codigo: Number(item.codigo),
            acronimo: item.acronimo,
            estadoId: 1,
          });
        } else {
          await axios.delete(`/v1/municipio/${item.id}`);
        }
        if (selectedDeptoId) await loadMunicipios(selectedDeptoId);
      }

      setMessage({
        open: true,
        severity: "success",
        text: isActivating
          ? t("localizacionGeografica.messages.activatedSuccess", "Registro activado con éxito")
          : t("localizacionGeografica.messages.inactivatedSuccess", "Registro inactivado con éxito"),
      });
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message || err.message;
      setMessage({
        open: true,
        severity: "error",
        text: `${t("localizacionGeografica.messages.actionError", "Error al cambiar estado:")} ${detail}`,
      });
    } finally {
      closeModal("confirm");
    }
  };

  const getImpactMessage = () => {
    const { type, item } = actionContext;
    if (!item) return [];
    if (type === "pais") {
      const deptoCount = departamentos.filter((depto) => depto.paisId === item.id).length;
      const deptoIds = departamentos.filter((depto) => depto.paisId === item.id).map((depto) => depto.id);
      const munCount = municipios.filter((municipio) => deptoIds.includes(municipio.departamentoId)).length;
      return [
        t("localizacionGeografica.confirm.departmentsAffected", { count: deptoCount }),
        t("localizacionGeografica.confirm.municipalitiesAffected", { count: munCount }),
      ];
    }
    if (type === "depto") {
      const munCount = municipios.filter((municipio) => municipio.departamentoId === item.id).length;
      return [t("localizacionGeografica.confirm.municipalitiesAffected", { count: munCount })];
    }
    return [];
  };

  const countryButtonBaseSx = {
    minWidth: 44,
    width: 44,
    height: 40,
    p: 0,
    borderRadius: 2,
    boxShadow: isDark
      ? "0 8px 20px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.16)"
      : "0 6px 18px rgba(23,63,57,0.08), 0 2px 6px rgba(0,0,0,0.06)",
  };
  const countryAddSx = {
    ...countryButtonBaseSx,
    bgcolor: isDark ? "#173f39" : "#1d4d45",
    color: "#fff",
    "&:hover": { bgcolor: isDark ? "#21534b" : "#173f39" },
  };
  const countryEditSx = {
    ...countryButtonBaseSx,
    bgcolor: isDark ? alpha("#2b6b60", 0.28) : "#d9e9e3",
    color: isDark ? "#e7f6f7" : "#173f39",
    "&:hover": { bgcolor: isDark ? alpha("#2b6b60", 0.4) : "#cfe1da" },
    "&.Mui-disabled": {
      color: isDark ? alpha("#e7f6f7", 0.38) : "#7f9790",
      bgcolor: isDark ? alpha("#2b6b60", 0.12) : "#edf3f0",
    },
  };
  const countryDangerSx = {
    ...countryButtonBaseSx,
    bgcolor: isDark ? alpha("#ffb4ab", 0.12) : "#fff0f0",
    color: isDark ? "#ffb4ab" : "#d32f2f",
    "&:hover": { bgcolor: isDark ? alpha("#ffb4ab", 0.18) : "#ffdede" },
    "&.Mui-disabled": {
      color: isDark ? alpha("#ffb4ab", 0.4) : "#f19999",
      bgcolor: isDark ? alpha("#ffb4ab", 0.08) : "#fff6f6",
    },
  };

  const deptoColumns = useMemo(() => [
    { field: "codigo", headerKey: "localizacionGeografica.columns.code", flex: 1, minWidth: 100 },
    { field: "nombre", headerKey: "localizacionGeografica.columns.name", flex: 2, minWidth: 200 },
    { field: "acronimo", headerKey: "localizacionGeografica.columns.acronym", flex: 1, minWidth: 100 },
    { field: "estado", headerKey: "localizacionGeografica.columns.status", type: "status", flex: 1, minWidth: 100 },
  ], []);

  return (
    <Box sx={{ width: "100%", p: 3, color: "text.primary", minHeight: "80vh" }}>
      <SectionHeader titleKey="localizacionGeografica.title" />

      <MessageSnackBar message={message} setMessage={setMessage} />

      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mb: 4 }}>
        <Select
          value={selectedPaisId}
          onChange={(event) => {
            setSelectedPaisId(event.target.value);
            setSelectedDeptoId(null);
            setDeptoFilters(null);
          }}
          size="small"
          sx={{ minWidth: 250 }}
        >
          {paises.map((pais) => (
            <MenuItem key={pais.id} value={pais.id}>
              {pais.nombre} ({pais.acronimo}) {pais.estado === INACTIVE_STATUS ? t("localizacionGeografica.labels.inactiveSuffix") : ""}
            </MenuItem>
          ))}
        </Select>
        <Tooltip title={t("common.actions.add")}>
          <Button sx={countryAddSx} onClick={() => openModal("pais", { type: "pais", item: null })}>
            <Add />
          </Button>
        </Tooltip>
        <Tooltip title={t("common.actions.update")}>
          <Button disabled={!selectedPais} sx={countryEditSx} onClick={() => openModal("pais", { type: "pais", item: selectedPais })}>
            <Edit />
          </Button>
        </Tooltip>
        <Tooltip title={selectedPais?.estado === INACTIVE_STATUS ? t("localizacionGeografica.actions.activate") : t("localizacionGeografica.actions.inactivate")}>
          <Button
            disabled={!selectedPais}
            sx={countryDangerSx}
            onClick={() => openModal("confirm", { type: "pais", item: selectedPais, isActivating: selectedPais?.estado === INACTIVE_STATUS })}
          >
            {selectedPais?.estado === INACTIVE_STATUS ? <Check /> : <Close />}
          </Button>
        </Tooltip>
      </Box>

      <GridActionBar
        onAdd={() => openModal("depto", { type: "depto", item: null })}
        onUpdate={() => openModal("depto", { type: "depto", item: selectedDepto })}
        onDelete={() => openModal("confirm", { type: "depto", item: selectedDepto, isActivating: selectedDepto?.estado === INACTIVE_STATUS })}
        canAdd={Boolean(selectedPais && selectedPais.estado !== INACTIVE_STATUS)}
        canUpdate={Boolean(selectedDepto)}
        canDelete={Boolean(selectedDepto)}
        onFilters={() => setModalState((prev) => ({ ...prev, filtroDepto: true }))}
        labels={{
          delete: selectedDepto?.estado === INACTIVE_STATUS
            ? t("localizacionGeografica.actions.activate")
            : t("localizacionGeografica.actions.inactivate"),
        }}
        extraActions={
          <Button disabled={!selectedDepto} onClick={() => setModalState((prev) => ({ ...prev, municipioList: true }))}>
            {t("localizacionGeografica.actions.viewMunicipalities")}
          </Button>
        }
      />

      <AppDataGrid
        rows={deptosByPais}
        columns={deptoColumns}
        loading={loading}
        selectedRow={selectedDepto}
        setSelectedRow={(row) => setSelectedDeptoId(row?.id || null)}
        containerSx={{ borderRadius: 4 }}
      />

      <PaisModal
        open={modalState.pais}
        onClose={() => closeModal("pais")}
        onSave={handleSavePais}
        paisToEdit={actionContext.item}
      />
      <DepartamentoModal
        open={modalState.depto}
        onClose={() => closeModal("depto")}
        onSave={handleSaveDepto}
        deptoToEdit={actionContext.item}
        paisContext={selectedPais}
      />
      <ConfirmInactivateModal
        open={modalState.confirm}
        onClose={() => closeModal("confirm")}
        onConfirm={handleConfirmAction}
        title={t("localizacionGeografica.confirm.title", { type: actionContext.type })}
        itemName={actionContext.item?.nombre}
        isActivating={actionContext.isActivating}
        impactMessage={getImpactMessage()}
      />
      <FiltroModal
        open={modalState.filtroDepto}
        onClose={() => closeModal("filtroDepto")}
        currentFilters={deptoFilters}
        onFilter={setDeptoFilters}
      />
      <FiltroModal
        open={modalState.filtroMun}
        onClose={() => closeModal("filtroMun")}
        currentFilters={munFilters}
        onFilter={setMunFilters}
      />
      <MunicipiosListModal
        open={modalState.municipioList}
        onClose={() => closeModal("municipioList")}
        paisContext={selectedPais}
        deptoContext={selectedDepto}
        municipios={municipiosByDepto}
        onAdd={() => openModal("municipioForm", { type: "municipio", item: null })}
        onEdit={(municipio) => openModal("municipioForm", { type: "municipio", item: municipio })}
        onInactivate={(municipio) => openModal("confirm", { type: "municipio", item: municipio, isActivating: municipio.estado === INACTIVE_STATUS })}
        onOpenFilter={() => setModalState((prev) => ({ ...prev, filtroMun: true }))}
      />
      <MunicipioModal
        open={modalState.municipioForm}
        onClose={() => closeModal("municipioForm")}
        onSave={handleSaveMunicipio}
        municipioToEdit={actionContext.item}
        paisContext={selectedPais}
        deptoContext={selectedDepto}
      />
    </Box>
  );
}
