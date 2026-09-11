/*=============================================================================
Nombre del archivo : Rkardex.jsx
Descripcion        : Reportes del modulo Kardex y vista previa PDF.
===============================================================================
CONTROL DE CAMBIOS
+------------+---------+----------------------+----------------------------------------------+
|   Fecha    | Version |      Autor           | Descripcion del cambio                       |
+------------+---------+----------------------+----------------------------------------------+
| 2026-09-11 | 0.4.0   | Cesar Medina         | Aplica estilo visual consistente a preview.  |
| 2026-09-11 | 0.4.0   | Cesar Medina         | Adapta vista de reportes al modal embebido.  |
+------------+---------+----------------------+----------------------------------------------+
=============================================================================*/
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Box, Typography, TextField, Button, Stack, Grid,
  FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import axios from "../axiosConfig";
import MessageSnackBar from "../MessageSnackBar";

import useUbicacionFilters from "../useUbicacionFilters";
import UbicacionProductoVencimientoFilters from "../UbicacionProductoVencimientoFilters.jsx";

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
    darkGreen,
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
  };
};

export default function RE_kardexPedido({ embeddedInDialog = false }) {
  const theme = useTheme();
  const dialogUi = getDialogUi(theme);
  const empresaId = localStorage.getItem("empresaId");
  const token = localStorage.getItem("token");
  const headers = { headers: { Authorization: `Bearer ${token}` } };

  // ===== Utils
  const asArray = (x) => (Array.isArray(x) ? x : x?.content ?? x?.data ?? []);
  const getFechaKdx = (o) =>
    o?.karFechaHora ?? o?.fechaHora ?? o?.fecha ?? o?.createdAt ?? null;
  const toLocal = (val) => {
    if (!val) return "";
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleString();
  };

  // "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DD HH:mm"
  const toDateStr = (val, end = false) => {
    if (!val) return null;
    const [d, t] = String(val).split("T");
    if (!d) return null;
    const hhmm = t ? t.slice(0, 5) : end ? "23:59" : "00:00";
    return `${d} ${hhmm}`;
  };

  // ===== Hook de ubicación (mismo patrón que RE_pedido / RE_productoVencimiento)
  const {
    form: ubi,
    handleChange: handleUbiChange,
    data: ubiData,
    resetTodo,
  } = useUbicacionFilters({ empresaId, headers, autoselectSingle: true });

  // ===== Filtros de kardex (producto, categoría, fechas)
  const [kdxFiltro, setKdxFiltro] = useState({
    producto_categoria_id: "",
    producto_id: "",
    produccion_id: "",
    producto_presentacion_id: "",
    fecha_inicio: "",
    fecha_fin: "",
  });

  const handleFiltroChange = (name) => (e) => {
    const value = e?.target ? e.target.value : e;
    setKdxFiltro((f) => ({ ...f, [name]: value }));
  };

  // ===== Catálogos de producto / categoría (ubicación la maneja el hook)
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [producciones, setProducciones] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);



  useEffect(() => {
    Promise.all([
      axios.get("/v1/items/producto/0", headers).catch(() => ({ data: [] })),
      axios
        .get("/v1/items/producto_categoria/0", headers)
        .catch(() => ({ data: [] })),
      axios
        .get("/v1/items/produccion/0", headers)              // NUEVO
        .catch(() => ({ data: [] })),
      axios
        .get("/v1/items/producto_presentacion/0", headers)   // NUEVO
        .catch(() => ({ data: [] })),
    ])
      .then(([pro, cat, prod, pres]) => {                    // NUEVO destructuring
        setProductos(asArray(pro.data));
        setCategorias(asArray(cat.data));
        setProducciones(asArray(prod.data));                 // NUEVO
        setPresentaciones(asArray(pres.data));               // NUEVO
      })
      .catch(() =>
        setMessage({
          open: true,
          severity: "error",
          text: "No fue posible cargar los catálogos.",
        })
      );
  }, []);


  // ===== Estado UI
  const [resultados, setResultados] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [message, setMessage] = useState({
    open: false,
    severity: "info",
    text: "",
  });
  const [openUbi, setOpenUbi] = useState(false);
  const [errors, setErrors] = useState({ fechas_rango: false });

  const validarRango = () => {
    setErrors({ fechas_rango: false });
    if (kdxFiltro.fecha_inicio && kdxFiltro.fecha_fin) {
      const ini = new Date(kdxFiltro.fecha_inicio);
      const fin = new Date(kdxFiltro.fecha_fin);
      if (ini > fin) {
        setErrors({ fechas_rango: true });
        setMessage({
          open: true,
          severity: "warning",
          text: "La fecha de inicio no puede ser mayor que la fecha fin.",
        });
        return false;
      }
    }
    return true;
  };

  // ===== Listado (igual filosofía que Pedido/OC): trae todo y filtra por fechas
  const fetchAllKardex = async () => {
    const CANDIDATES = ["/v1/kardex"];
    const size = 200;
    for (const basePath of CANDIDATES) {
      try {
        // sin paginación
        const r0 = await axios.get(basePath, headers);
        const list0 = asArray(r0.data);
        if (list0.length) return list0;

        // con paginación
        let page = 0,
          acc = [];
        for (let i = 0; i < 15; i++) {
          const r = await axios.get(basePath, {
            params: { page, size },
            ...headers,
          });
          const list = asArray(r.data);
          if (!list.length) break;
          acc = acc.concat(list);
          page += 1;
        }
        if (acc.length) return acc;
      } catch (err) {
        if (import.meta.env.DEV)
          console.debug(
            "[fetchAllKardex] fallo",
            basePath,
            err?.response?.status
          );
      }
    }
    const e = new Error("No se encontró endpoint para listar kardex.");
    e.code = "NO_KARDEX_ENDPOINT";
    throw e;
  };

  // ===== Buscar (solo UX)
  const buscar = async () => {
    setResultados([]);
    setErrors({ fechas_rango: false });

    if (!validarRango()) return;

    try {
      const all = await fetchAllKardex();

      const ini = kdxFiltro.fecha_inicio
        ? new Date(kdxFiltro.fecha_inicio)
        : null;
      const fin = kdxFiltro.fecha_fin ? new Date(kdxFiltro.fecha_fin) : null;

      const lista = all.filter((row) => {
        const f = getFechaKdx(row);
        if (!f || (!ini && !fin)) return true;
        const d = new Date(f);
        if (isNaN(d.getTime())) return true;
        if (ini && d < ini) return false;
        if (fin && d > fin) return false;
        return true;
      });

      setResultados(lista);
      setMessage({
        open: true,
        severity: "info",
        text: `Mostrando ${lista.length} movimiento(s) de kardex.`,
      });
    } catch (err) {
      const msg =
        err?.code === "NO_KARDEX_ENDPOINT"
          ? "No se encontró el endpoint de listado de kardex (404)."
          : "No se pudo cargar el kardex.";
      console.error(err);
      setMessage({ open: true, severity: "error", text: msg });
    }
  };

  // ===== PDF: usa ubi + kdxFiltro (índices 0..8 como tenías) =====
  const buildCondicion = () => {
    const DEF_INI = "1900-01-01 00:00";
    const DEF_FIN = "2099-12-31 23:59";
    const userIni = toDateStr(kdxFiltro.fecha_inicio, false);
    const userFin = toDateStr(kdxFiltro.fecha_fin, true);

    const c = {};
    c["0"] = `e.emp_id = $EMPRESA_ID$`;
    c["1"] = ubi.municipio_id
      ? `AND m.mun_id = ${Number(ubi.municipio_id)}`
      : "";
    c["2"] = ubi.sede_id ? `AND s.sed_id = ${Number(ubi.sede_id)}` : "";
    c["3"] = ubi.bloque_id ? `AND blo.blo_id = ${Number(ubi.bloque_id)}` : "";
    c["4"] = ubi.espacio_id ? `AND esp.esp_id = ${Number(ubi.espacio_id)}` : "";
    c["5"] = ubi.almacen_id ? `AND al.alm_id = ${Number(ubi.almacen_id)}` : "";
    c["6"] = kdxFiltro.producto_id
      ? `AND p.pro_id = ${Number(kdxFiltro.producto_id)}`
      : "";
    c["7"] = kdxFiltro.producto_categoria_id
      ? `AND p.pro_producto_categoria_id = ${Number(
        kdxFiltro.producto_categoria_id
      )}`
      : "";
    c["9"] = kdxFiltro.produccion_id
      ? `AND pr.pro_id = ${Number(kdxFiltro.produccion_id)}`
      : "";

    // NUEVO: filtrar por producto_presentacion
    c["10"] = kdxFiltro.producto_presentacion_id
      ? `AND pp.prp_id = ${Number(kdxFiltro.producto_presentacion_id)}`
      : "";
    c["8"] = `AND k.kar_fecha_hora BETWEEN '${userIni ?? DEF_INI
      }' AND '${userFin ?? DEF_FIN}'`;
    return c;
  };

  // Decide report path based on selected filters
  const getReportPath = () => {
    // Priority: producción -> producto_presentacion -> generic kardex
    if (kdxFiltro.produccion_id) return "/v2/report/nuevo/kardex_produccion";
    if (kdxFiltro.producto_presentacion_id) return "/v2/report/nuevo/kardex_producto_presentacion";
    return "/v2/report/nuevo/kardex";
  };

  const requestPDF = async (condicion) => {
    const url = getReportPath();
    const payload = { condicion, EMPRESA_ID: empresaId };

    // Debug: log selected URL and payload before sending
    console.log('[requestPDF] POST', url, payload);

    try {
      return await axios({
        url,
        method: "POST",
        data: payload,
        responseType: "blob",
        ...headers,
      });
    } catch (e1) {
      // If a specialized endpoint (producción / producto_presentacion) is missing, fall back to generic kardex
      if (e1?.response?.status === 404 && url !== "/v2/report/nuevo/kardex") {
        console.log('[requestPDF] specialized endpoint not found, falling back to generic /v2/report/nuevo/kardex');
        console.log('[requestPDF] fallback POST', '/v2/report/nuevo/kardex', payload);
        return await axios({
          url: "/v2/report/nuevo/kardex",
          method: "POST",
          data: payload,
          responseType: "blob",
          ...headers,
        });
      }
      throw e1;
    }
  };

  const extractServerError = async (err) => {
    try {
      if (err?.response?.data instanceof Blob) {
        const t = await err.response.data.text();
        return t?.slice(0, 400) || err.message;
      }
    } catch {
      // noop
    }
    return err?.message || "Error desconocido";
  };

  const generarReporte = async () => {
    try {
      const condicion = buildCondicion();
      const res = await requestPDF(condicion);
      const blob = new Blob([res.data], { type: "application/pdf" });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewOpen(true);
      setMessage({ open: true, severity: "success", text: "PDF generado." });
    } catch (err) {
      const txt = await extractServerError(err);
      console.error(err);
      setMessage({
        open: true,
        severity: "error",
        text: `No se pudo generar el PDF (HTTP ${err?.response?.status ?? "?"
          }). ${txt}`,
      });
    }
  };

  return (
    <Box sx={{ p: embeddedInDialog ? { xs: 0.5, sm: 1 } : 4 }}>
      {!embeddedInDialog ? (
        <Typography variant="h4" gutterBottom>
          Reporte Kardex
        </Typography>
      ) : null}

      {/* Filtros principales (producto, categoría, fechas) */}
      <Grid container spacing={2} mb={2}>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Categoría Producto</InputLabel>
            <Select
              label="Categoría Producto"
              value={kdxFiltro.producto_categoria_id || ""}
              onChange={handleFiltroChange("producto_categoria_id")}
            >
              <MenuItem value="">
                <em>Todas</em>
              </MenuItem>
              {asArray(categorias).map((it) => (
                <MenuItem key={it.id} value={String(it.id)}>
                  {it.nombre ?? it.name ?? `#${it.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Producto</InputLabel>
            <Select
              label="Producto"
              value={kdxFiltro.producto_id || ""}
              onChange={handleFiltroChange("producto_id")}
            >
              <MenuItem value="">
                <em>Todos</em>
              </MenuItem>
              {asArray(productos).map((it) => (
                <MenuItem key={it.id} value={String(it.id)}>
                  {it.nombre ?? it.name ?? `#${it.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>



        {/* NUEVO: Producción */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Producción</InputLabel>
            <Select
              label="Producción"
              value={kdxFiltro.produccion_id || ""}
              onChange={handleFiltroChange("produccion_id")}
            >
              <MenuItem value="">
                <em>Todas</em>
              </MenuItem>
              {asArray(producciones).map((it) => (
                <MenuItem key={it.id} value={String(it.id)}>
                  {it.nombre ?? it.name ?? `#${it.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* NUEVO: Producto Presentación */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Presentación</InputLabel>
            <Select
              label="Presentación"
              value={kdxFiltro.producto_presentacion_id || ""}
              onChange={handleFiltroChange("producto_presentacion_id")}
            >
              <MenuItem value="">
                <em>Todas</em>
              </MenuItem>
              {asArray(presentaciones).map((it) => (
                <MenuItem key={it.id} value={String(it.id)}>
                  {it.nombre ?? it.name ?? `#${it.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Fecha Inicio"
            name="fecha_inicio"
            type="datetime-local"
            fullWidth
            value={kdxFiltro.fecha_inicio || ""}
            onChange={handleFiltroChange("fecha_inicio")}
            InputLabelProps={{ shrink: true }}
            error={errors.fechas_rango}
            helperText={
              errors.fechas_rango ? "Inicio no puede ser mayor que fin." : ""
            }
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Fecha Fin"
            name="fecha_fin"
            type="datetime-local"
            fullWidth
            value={kdxFiltro.fecha_fin || ""}
            onChange={handleFiltroChange("fecha_fin")}
            InputLabelProps={{ shrink: true }}
            error={errors.fechas_rango}
            helperText={
              errors.fechas_rango ? "Fin debe ser >= Inicio." : ""
            }
          />
        </Grid>
      </Grid>

      {/* Acciones */}
      <Stack direction="row" spacing={2} mb={3}>
        <Button variant="contained" onClick={buscar}>
          Buscar
        </Button>
        <Button variant="outlined" onClick={generarReporte}>
          Generar Reporte
        </Button>
        <Button variant="text" onClick={() => setOpenUbi(true)}>
          Filtros (ubicación)
        </Button>
      </Stack>

      {/* Diálogo: reutilizamos UbicacionProductoVencimientoFilters */}
      <UbicacionProductoVencimientoFilters
        variant="dialog"
        title="Filtros (ubicación)"
        open={openUbi}
        onClose={() => setOpenUbi(false)}
        // Ubicación
        ubiForm={ubi}
        ubiData={ubiData}
        handleUbiChange={handleUbiChange}
        onUbiReset={resetTodo}
        // Kardex: producto / categoría / fechas
        filtro={kdxFiltro}
        productos={productos}
        categorias={categorias}
        handleFiltroChange={handleFiltroChange}
        fechasError={errors.fechas_rango}
        // Aplicar
        onApply={() => {
          setOpenUbi(false);
          buscar();
        }}
      />

      {/* Tabla resultados */}
      {resultados.length > 0 && (
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Kardex encontrado
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Fecha/Hora</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultados.map((row, idx) => (
                  <TableRow key={row.id ?? idx}>
                    <TableCell>{row.id ?? ""}</TableCell>
                    <TableCell>{toLocal(getFechaKdx(row))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Preview PDF */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: dialogUi.paperSx }}
      >
        <DialogTitle sx={dialogUi.titleSx}>
          Vista previa del Reporte
          <IconButton
            onClick={() => setPreviewOpen(false)}
            sx={{
              ...dialogUi.subtleButtonSx,
              position: "absolute",
              right: 16,
              top: 12,
              p: 0.75,
              minWidth: "auto",
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={dialogUi.contentSx}>
          <Box sx={{ ...dialogUi.bodyCardSx, p: 1.5 }}>
            {previewUrl && (
              <iframe
                src={previewUrl}
                width="100%"
                height="600"
                title="PDF"
                style={{ border: "none", borderRadius: "12px", backgroundColor: "#fff" }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={dialogUi.actionsSx}>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={() => setPreviewOpen(false)} sx={dialogUi.secondaryButtonSx}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <MessageSnackBar message={message} setMessage={setMessage} />
    </Box>
  );
}

RE_kardexPedido.propTypes = {
  embeddedInDialog: PropTypes.bool,
};
