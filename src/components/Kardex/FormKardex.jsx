/*=============================================================================
Nombre del archivo : FormKardex.jsx
Descripcion        : Formulario maestro y detalle para gestion de Kardex.
===============================================================================
CONTROL DE CAMBIOS
+------------+---------+----------------------+-----------------------------+
|   Fecha    | Version |      Autor           | Descripcion del cambio      |
+------------+---------+----------------------+-----------------------------+
| 2026-05-08 | 0.4.0   | Jeisson Sanchez      | Encabezado estandar agregado.|
| 2026-09-09 | 0.4.0   | Cesar Medina         | Preserva encabezado y detalle entre pasos. |
+------------+---------+----------------------+-----------------------------+
=============================================================================*/
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  FormHelperText,
  Grid,
  InputAdornment,
  IconButton,
} from "@mui/material";
import PropTypes from "prop-types";
import SearchIcon from "@mui/icons-material/Search";
import axios from "../axiosConfig";
import * as Yup from "yup";
import GridArticuloKardex from "./GridArticuloKardex";
import { resolveKardexId } from "./utils/kardexFormatters";
import AppDataGrid from "../common/AppDataGrid";
import GridActionBar from "../common/GridActionBar";

const numberRequired = (msg, opts = {}) => {
  let y = Yup.number().typeError(msg).required(msg);
  if (opts.min !== undefined) y = y.min(opts.min, `${msg} (min ${opts.min})`);
  return y;
};

const kardexSchema = Yup.object({
  fechaHora: Yup.string().required("Fecha/Hora obligatoria."),
  almacenId: numberRequired("Almacen obligatorio.", { min: 1 }),
  produccionId: numberRequired("Produccion obligatoria.", { min: 1 }),
  tipoMovimientoId: numberRequired("Tipo de movimiento obligatorio.", { min: 1 }),
  descripcion: Yup.string().max(500, "Max 500 caracteres."),
  pedidoId: Yup.number().nullable().transform((v, o) => (o === "" ? null : v)),
  ordenCompraId: Yup.number().nullable().transform((v, o) => (o === "" ? null : v)),
  clienteProveedorId: Yup.number().nullable().transform((v, o) => (o === "" ? null : v)),
});

const pickList = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.content)) return d.content;
  if (Array.isArray(d?.data?.content)) return d.data.content;
  return [];
};

const normalize = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const renderName = (it) => it?.name ?? it?.nombre ?? it?.descripcion ?? `#${it?.id}`;

const getPresentacionId = (p) =>
  p?.id ??
  p?.presentacionProductoId ??
  p?.presentacion_producto_id ??
  p?.idPresentacionProducto ??
  p?.prpId ??
  null;

const renderPresentacion = (it) => {
  const p =
    it?.producto?.nombre ??
    it?.producto?.name ??
    it?.productoNombre ??
    it?.nombreProducto ??
    "";
  const pr =
    it?.presentacion?.nombre ??
    it?.presentacion?.name ??
    it?.presentacionNombre ??
    it?.nombre ??
    it?.name ??
    "";
  return [p, pr].filter(Boolean).join(" - ") || `#${it?.id}`;
};

const extractApiMessage = (err, fallback) => {
  const data = err?.response?.data;
  return (typeof data === "string" && data) || data?.message || data?.detail || data?.title || fallback;
};

const toDateTimeLocal = (val) => {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const newArticleDraft = () => ({
  id: null,
  kardexItemId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  presentacionProductoId: "",
  productoId: "",
  cantidad: "",
  precio: "",
  lote: "",
  fechaVencimiento: "",
  devolutivo: false,
  responsableId: null,
  estadoId: 1,
});

const DEFAULT_ARTICLE_FILTERS = {
  productoId: "",
};

const EMPTY_FORM_DATA = {
  id: undefined,
  fechaHora: "",
  almacenId: "",
  almacenDestinoId: "",
  produccionId: "",
  tipoMovimientoId: "",
  pedidoId: "",
  ordenCompraId: "",
  clienteProveedorId: "",
  descripcion: "",
};

const toNumericIdOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const isPresentacionDevolutiva = (p) =>
  Boolean(
    p?.desgregar ??
      p?.desagregar ??
      p?.devolutivo ??
      p?.esDevolutivo ??
      p?.requiereResponsable ??
      p?.producto?.devolutivo ??
      p?.producto?.esDevolutivo
  );

export default function FormKardex({
  open,
  setOpen,
  formMode = "create",
  startInArticles = false,
  selectedRow,
  reloadData,
  setMessage,
  setSelectedRow,
}) {
  const [formData, setFormData] = useState({
    id: undefined,
    fechaHora: "",
    almacenId: "",
    almacenDestinoId: "",
    produccionId: "",
    tipoMovimientoId: "",
    pedidoId: "",
    ordenCompraId: "",
    clienteProveedorId: "",
    descripcion: "",
  });
  const [errors, setErrors] = useState({});

  const [almacenes, setAlmacenes] = useState([]);
  const [producciones, setProducciones] = useState([]);
  const [tiposMovimiento, setTiposMovimiento] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [ordenesCompraByPedido, setOrdenesCompraByPedido] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);
  const [responsables, setResponsables] = useState([]);

  const [draftItems, setDraftItems] = useState([]);
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [articleSelectedRow, setArticleSelectedRow] = useState(null);

  const [articleFormOpen, setArticleFormOpen] = useState(false);
  const [articleFormMode, setArticleFormMode] = useState("create");
  const [articleFormData, setArticleFormData] = useState(newArticleDraft());
  const [savingKardex, setSavingKardex] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupType, setLookupType] = useState("");
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupSelectedRow, setLookupSelectedRow] = useState(null);
  const [fetchedPresentacionIds, setFetchedPresentacionIds] = useState({});
  const [articleFiltersOpen, setArticleFiltersOpen] = useState(false);
  const [articleFilters, setArticleFilters] = useState(DEFAULT_ARTICLE_FILTERS);
  const createSessionInitializedRef = useRef(false);
  const editSessionKeyRef = useRef(null);
  const [pendingEditFallback, setPendingEditFallback] = useState(null);

  const token = localStorage.getItem("token");
  const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  const openLookup = (type) => {
    if (type === "presentacion" && !articleFormData?.productoId) {
      setMessage({
        open: true,
        severity: "warning",
        text: "Primero debes seleccionar un producto para buscar presentaciones.",
      });
      return;
    }
    setLookupType(type);
    setLookupQuery("");
    setLookupSelectedRow(null);
    setLookupOpen(true);
  };

  const findIdByName = (items, rawName) => {
    const wanted = normalize(rawName);
    if (!wanted) return "";
    const found = (items || []).find((it) => normalize(renderName(it)) === wanted);
    return found?.id ?? "";
  };

  const getProductoIdFromPresentacionObj = (p) =>
    p?.producto?.id ??
    p?.productoId ??
    p?.productoIdentificadorId ??
    p?.idProducto ??
    p?.productoID ??
    p?.prpProductoId ??
    p?.producto_id_fk ??
    p?.producto_id ??
    p?.proId ??
    p?.producto?.productoId ??
    p?.producto_presentacion?.productoId ??
    "";

  const fetchPresentacionesPaged = async () => {
    try {
      const size = 500;
      const first = await axios.get("/v1/producto_presentacion", { ...headers, params: { page: 0, size } });
      const firstData = first?.data ?? {};
      const contentFirst = Array.isArray(firstData?.content) ? firstData.content : [];
      const totalPages =
        Number(firstData?.page?.totalPages ?? firstData?.totalPages ?? 1) || 1;
      if (totalPages <= 1) return contentFirst;

      const calls = [];
      for (let p = 1; p < totalPages; p += 1) {
        calls.push(axios.get("/v1/producto_presentacion", { ...headers, params: { page: p, size } }));
      }
      const rest = await Promise.allSettled(calls);
      const merged = [...contentFirst];
      rest.forEach((r) => {
        if (r.status !== "fulfilled") return;
        const d = r.value?.data ?? {};
        const c = Array.isArray(d?.content) ? d.content : [];
        merged.push(...c);
      });
      return merged;
    } catch {
      return [];
    }
  };

  const getProductoIdFromPresentacion = (presentacionProductoId) => {
    const found = (presentaciones || []).find(
      (p) => String(getPresentacionId(p)) === String(presentacionProductoId)
    );
    return getProductoIdFromPresentacionObj(found);
  };

  const getProductoNombreByPresentacionId = (presentacionProductoId) => {
    const found = (presentaciones || []).find(
      (p) => String(getPresentacionId(p)) === String(presentacionProductoId)
    );
    if (!found) return "";
    const pid = getProductoIdFromPresentacionObj(found);
    const product = (productos || []).find((p) => String(p?.id) === String(pid));
    return (
      found?.producto?.nombre ??
      found?.producto?.name ??
      found?.productoNombre ??
      found?.nombreProducto ??
      product?.nombre ??
      product?.name ??
      ""
    );
  };

  const fetchProductoIdByPresentacion = async (presentacionProductoId) => {
    if (!presentacionProductoId) return "";
    try {
      const res = await axios.get(`/v1/producto_presentacion/${presentacionProductoId}`, headers);
      const pp = res?.data ?? {};
      return (
        pp?.producto?.id ??
        pp?.productoId ??
        pp?.producto_id ??
        pp?.proId ??
        pp?.idProducto ??
        pp?.producto?.productoId ??
        ""
      );
    } catch {
      return "";
    }
  };

  const fetchPresentacionDetalle = async (presentacionProductoId) => {
    if (!presentacionProductoId) return null;
    try {
      const res = await axios.get(`/v1/producto_presentacion/${presentacionProductoId}`, headers);
      return res?.data ?? null;
    } catch {
      return null;
    }
  };

  const getDevolutivoByPresentacionId = (presentacionProductoId, fallback = false) => {
    const pres = (presentaciones || []).find(
      (p) => String(getPresentacionId(p)) === String(presentacionProductoId)
    );
    if (!pres) return Boolean(fallback);
    return isPresentacionDevolutiva(pres);
  };

  const presentacionesByProducto = useMemo(() => {
    const pid = articleFormData?.productoId;
    if (!pid) return [];
    const filtered = (presentaciones || []).filter(
      (p) => String(getProductoIdFromPresentacionObj(p)) === String(pid)
    );
    if (filtered.length) return filtered;

    const selectedProd = productos.find((p) => String(p?.id) === String(pid));
    const selectedProdName = normalize(renderName(selectedProd));
    if (!selectedProdName) return filtered;

    return (presentaciones || []).filter((p) => normalize(renderPresentacion(p)).includes(selectedProdName));
  }, [presentaciones, articleFormData?.productoId, productos]);

  const presentacionSeleccionada = useMemo(
    () =>
      (presentaciones || []).find(
        (p) => String(getPresentacionId(p)) === String(articleFormData?.presentacionProductoId)
      ) ?? null,
    [presentaciones, articleFormData?.presentacionProductoId]
  );

  const tipoMovimientoSeleccionado = useMemo(
    () => tiposMovimiento.find((t) => String(t.id) === String(formData.tipoMovimientoId)) ?? null,
    [tiposMovimiento, formData.tipoMovimientoId]
  );

  const tipoMovimientoTexto = normalize(renderName(tipoMovimientoSeleccionado));
  const isEntradaUi = tipoMovimientoTexto.includes("entrada");
  const isTrasladoUi =
    tipoMovimientoTexto.includes("traslado") || tipoMovimientoTexto.includes("transfer");

  const getPedidoIdFromOc = (oc) =>
    oc?.pedidoId ?? oc?.pedido_id ?? oc?.ped_id ?? oc?.orc_pedido_id ?? oc?.pedido?.id ?? null;

  const ordenesCompraFiltradas = useMemo(() => {
    if (!isEntradaUi || !formData.pedidoId) return [];
    if (ordenesCompraByPedido.length) return ordenesCompraByPedido;
    return ordenesCompra.filter((oc) => String(getPedidoIdFromOc(oc)) === String(formData.pedidoId));
  }, [isEntradaUi, formData.pedidoId, ordenesCompra, ordenesCompraByPedido]);

  const selectedProduccionLabel = useMemo(() => {
    const it = producciones.find((p) => String(p?.id) === String(formData?.produccionId));
    return it ? renderName(it) : "";
  }, [producciones, formData?.produccionId]);

  const selectedPedidoLabel = useMemo(() => {
    const it = pedidos.find((p) => String(p?.id) === String(formData?.pedidoId));
    return it ? renderName(it) : "";
  }, [pedidos, formData?.pedidoId]);

  const selectedProductoLabel = useMemo(() => {
    const it = productos.find((p) => String(p?.id) === String(articleFormData?.productoId));
    if (it) return renderName(it);
    return articleFormData?.productoNombre ?? "";
  }, [productos, articleFormData?.productoId, articleFormData?.productoNombre]);

  const selectedPresentacionLabel = useMemo(() => {
    const it = presentaciones.find(
      (p) => String(getPresentacionId(p)) === String(articleFormData?.presentacionProductoId)
    );
    if (it) return renderPresentacion(it);
    return articleFormData?.presentacionNombre ?? "";
  }, [presentaciones, articleFormData?.presentacionProductoId, articleFormData?.presentacionNombre]);

  const getProductoNombreById = (productoId) => {
    if (!productoId) return "";
    const it = (productos || []).find((p) => String(p?.id) === String(productoId));
    return it ? renderName(it) : "";
  };

  const articleProductoOptions = useMemo(() => {
    const map = new Map();
    (draftItems || []).forEach((it) => {
      const productoId =
        toNumericIdOrNull(it?.productoId) ??
        toNumericIdOrNull(getProductoIdFromPresentacion(it?.presentacionProductoId));
      if (!productoId) return;
      const nombre =
        it?.productoNombre ||
        getProductoNombreByPresentacionId(it?.presentacionProductoId) ||
        getProductoNombreById(productoId) ||
        `Producto ${productoId}`;
      map.set(String(productoId), { id: productoId, nombre });
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [draftItems, presentaciones, productos]);

  const hasActiveArticleFilters = Boolean(articleFilters.productoId !== "");

  const filteredDraftItems = useMemo(() => {
    let rows = Array.isArray(draftItems) ? [...draftItems] : [];
    if (articleFilters.productoId !== "") {
      rows = rows.filter((it) => {
        const itemProductoId =
          toNumericIdOrNull(it?.productoId) ??
          toNumericIdOrNull(getProductoIdFromPresentacion(it?.presentacionProductoId));
        return String(itemProductoId ?? "") === String(articleFilters.productoId);
      });
    }

    return rows;
  }, [draftItems, articleFilters]);

  const lookupBaseRows = useMemo(() => {
    if (lookupType === "produccion") return producciones;
    if (lookupType === "pedido") return pedidos;
    if (lookupType === "producto") return productos;
    if (lookupType === "presentacion") {
      return presentacionesByProducto;
    }
    return [];
  }, [lookupType, producciones, pedidos, productos, presentacionesByProducto, presentaciones, articleFormData?.productoId]);

  const lookupRows = useMemo(() => {
    const q = normalize(lookupQuery);
    if (!q) return lookupBaseRows;
    return (lookupBaseRows || []).filter((r) => {
      const text =
        lookupType === "presentacion"
          ? renderPresentacion(r)
          : renderName(r);
      return normalize(text).includes(q) || normalize(String(r?.id ?? "")).includes(q);
    });
  }, [lookupBaseRows, lookupQuery, lookupType]);

  const lookupColumns = useMemo(() => {
    const nameHeader =
      lookupType === "presentacion" ? "Producto - Presentacion" : "Nombre";
    return [
      { field: "id", headerName: "ID", width: 110, type: "number" },
      {
        field: "nombre",
        headerName: nameHeader,
        flex: 1,
        minWidth: 260,
        valueGetter: (params) =>
          lookupType === "presentacion"
            ? renderPresentacion(params?.row)
            : renderName(params?.row),
      },
    ];
  }, [lookupType]);

  const lookupTitle = useMemo(() => {
    if (lookupType === "produccion") return "Seleccionar Produccion";
    if (lookupType === "pedido") return "Seleccionar Pedido";
    if (lookupType === "producto") return "Seleccionar Producto";
    if (lookupType === "presentacion") return "Seleccionar Presentacion";
    return "Seleccionar";
  }, [lookupType]);

  const buildFallbackFormData = (row, kardexId, currentData = EMPTY_FORM_DATA) => ({
    id: currentData?.id ?? kardexId,
    fechaHora: currentData?.fechaHora || toDateTimeLocal(row?.fechaHora),
    almacenId: currentData?.almacenId || findIdByName(almacenes, row?.nombreAlmacen),
    almacenDestinoId:
      currentData?.almacenDestinoId || findIdByName(almacenes, row?.nombreAlmacenDestino),
    produccionId: currentData?.produccionId || findIdByName(producciones, row?.nombreProduccion),
    tipoMovimientoId:
      currentData?.tipoMovimientoId || findIdByName(tiposMovimiento, row?.nombreTipoMovimiento),
    pedidoId: currentData?.pedidoId ?? "",
    ordenCompraId: currentData?.ordenCompraId ?? "",
    clienteProveedorId:
      currentData?.clienteProveedorId || findIdByName(empresas, row?.nombreClienteProveedor),
    descripcion: currentData?.descripcion ?? "",
  });

  useEffect(() => {
    if (!open && !articleModalOpen) return;

    const loadLists = async () => {
      const [reqs, presentacionesPaged] = await Promise.all([
        Promise.allSettled([
        axios.get("/v1/items/tipo_movimiento/0", headers),
        axios.get("/v1/items/produccion/0", headers),
        axios.get("/v1/items/almacen/0", headers),
        axios.get("/v1/items/producto/0", headers),
        axios.get("/v1/items/pedido/0", headers),
        axios.get("/v1/items/orden_compra/0", headers),
        axios.get("/v1/items/empresa/0", headers),
        axios.get("/v1/items/proveedor/0", headers),
        axios.get("/v1/items/producto_presentacion/0", headers),
        axios.get("/v1/items/usuario_empresa/0", headers),
        ]),
        fetchPresentacionesPaged(),
      ]);

      const pick = (idx) => (reqs[idx]?.status === "fulfilled" ? pickList(reqs[idx].value) : []);

      setTiposMovimiento(pick(0));
      setProducciones(pick(1));
      setAlmacenes(pick(2));
      setProductos(pick(3));
      setPedidos(pick(4));
      setOrdenesCompra(pick(5));

      const empresasBase = pick(6);
      const proveedoresBase = pick(7);
      const merged = [...empresasBase];
      const seen = new Set(empresasBase.map((e) => String(e?.id)));
      for (const p of proveedoresBase) {
        const id = p?.id;
        if (id == null || seen.has(String(id))) continue;
        merged.push(p);
        seen.add(String(id));
      }
      setEmpresas(merged);
      const presentacionesItems = pick(8);
      const mergedPresentaciones = [...presentacionesPaged];
      const seenPresentaciones = new Set(
        mergedPresentaciones.map((p) => String(getPresentacionId(p))).filter((id) => id !== "null")
      );
      for (const it of presentacionesItems) {
        const id = getPresentacionId(it);
        if (id == null || seenPresentaciones.has(String(id))) continue;
        mergedPresentaciones.push(it);
        seenPresentaciones.add(String(id));
      }
      setPresentaciones(mergedPresentaciones);
      setResponsables(pick(9));
    };

    loadLists();
  }, [open, articleModalOpen]);

  useEffect(() => {
    if (!articleFormOpen) return;
    if (articleFormData?.productoId || !articleFormData?.presentacionProductoId) return;
    const pid = getProductoIdFromPresentacion(articleFormData.presentacionProductoId);
    if (pid) {
      setArticleFormData((prev) => ({ ...prev, productoId: Number(pid) }));
    }
  }, [articleFormOpen, articleFormData?.productoId, articleFormData?.presentacionProductoId, presentaciones]);

  useEffect(() => {
    const ids = Array.from(
      new Set(
        (draftItems || [])
          .map((it) => toNumericIdOrNull(it?.presentacionProductoId))
          .filter((id) => id != null)
      )
    );
    if (!ids.length) return;

    const missingIds = ids.filter((id) => {
      const inCache = (presentaciones || []).some((p) => String(getPresentacionId(p)) === String(id));
      return !inCache && !fetchedPresentacionIds[String(id)];
    });
    if (!missingIds.length) return;

    let alive = true;
    Promise.allSettled(missingIds.map((id) => fetchPresentacionDetalle(id))).then((results) => {
      if (!alive) return;

      const fetched = [];
      const marks = {};
      results.forEach((res, idx) => {
        const id = String(missingIds[idx]);
        marks[id] = true;
        if (res.status !== "fulfilled") return;
        const row = res.value;
        if (row) fetched.push(row);
      });

      if (Object.keys(marks).length) {
        setFetchedPresentacionIds((prev) => ({ ...prev, ...marks }));
      }

      if (!fetched.length) return;
      setPresentaciones((prev) => {
        const next = Array.isArray(prev) ? [...prev] : [];
        const seen = new Set(next.map((p) => String(getPresentacionId(p))));
        fetched.forEach((row) => {
          const pid = getPresentacionId(row);
          if (pid == null) return;
          if (seen.has(String(pid))) return;
          next.push(row);
          seen.add(String(pid));
        });
        return next;
      });
    });

    return () => {
      alive = false;
    };
  }, [draftItems, presentaciones, fetchedPresentacionIds]);

  useEffect(() => {
    if (!articleFormOpen || !articleFormData?.productoId) return;
    const unresolvedIds = Array.from(
      new Set(
        (presentaciones || [])
          .map((p) => {
            const id = toNumericIdOrNull(getPresentacionId(p));
            const productId = toNumericIdOrNull(getProductoIdFromPresentacionObj(p));
            if (!id || productId) return null;
            if (fetchedPresentacionIds[String(id)]) return null;
            return id;
          })
          .filter((id) => id != null)
      )
    );
    if (!unresolvedIds.length) return;

    let alive = true;
    const batch = unresolvedIds.slice(0, 100);
    Promise.allSettled(batch.map((id) => fetchPresentacionDetalle(id))).then((results) => {
      if (!alive) return;

      const detailById = {};
      const marks = {};
      results.forEach((res, idx) => {
        const id = String(batch[idx]);
        marks[id] = true;
        if (res.status !== "fulfilled") return;
        const row = res.value;
        if (!row) return;
        const pid = getPresentacionId(row);
        if (pid != null) detailById[String(pid)] = row;
      });

      if (Object.keys(marks).length) {
        setFetchedPresentacionIds((prev) => ({ ...prev, ...marks }));
      }

      if (!Object.keys(detailById).length) return;
      setPresentaciones((prev) =>
        (prev || []).map((p) => {
          const id = getPresentacionId(p);
          return id != null && detailById[String(id)] ? detailById[String(id)] : p;
        })
      );
    });

    return () => {
      alive = false;
    };
  }, [articleFormOpen, articleFormData?.productoId, presentaciones, fetchedPresentacionIds]);

  useEffect(() => {
    if (!draftItems.length) return;
    setDraftItems((prev) =>
      (prev || []).map((it) => {
        const productoId = toNumericIdOrNull(it?.productoId) ?? toNumericIdOrNull(getProductoIdFromPresentacion(it?.presentacionProductoId));
        const productoNombre = getProductoNombreByPresentacionId(it?.presentacionProductoId) || it?.productoNombre || "";
        const presentacionObj = (presentaciones || []).find(
          (p) => String(getPresentacionId(p)) === String(it?.presentacionProductoId)
        );
        const presentacionNombre = it?.presentacionNombre || (presentacionObj ? renderPresentacion(presentacionObj) : "");
        const devolutivo = getDevolutivoByPresentacionId(it?.presentacionProductoId, it?.devolutivo);

        return {
          ...it,
          productoId: productoId ?? "",
          productoNombre,
          presentacionNombre,
          devolutivo,
          responsableId: devolutivo ? toNumericIdOrNull(it?.responsableId) : null,
        };
      })
    );
  }, [presentaciones]);

  useEffect(() => {
    if (open || articleModalOpen) return;
    createSessionInitializedRef.current = false;
    editSessionKeyRef.current = null;
    setPendingEditFallback(null);
  }, [open, articleModalOpen]);

  useEffect(() => {
    if (!open || formMode !== "create" || createSessionInitializedRef.current) return;

    setFormData({ ...EMPTY_FORM_DATA });
    setDraftItems([]);
    setArticleSelectedRow(null);
    setErrors({});
    setPendingEditFallback(null);
    createSessionInitializedRef.current = true;
  }, [open, formMode]);

  useEffect(() => {
    if (!open || formMode !== "edit") return;

    const kardexId = resolveKardexId(selectedRow);
    if (!kardexId) return;

    const sessionKey = String(kardexId);
    if (editSessionKeyRef.current === sessionKey) return;
    editSessionKeyRef.current = sessionKey;

    const loadEditData = async () => {
      try {
        const res = await axios.get(`/v1/kardex/${kardexId}/update-form`, headers);
        const data = res?.data ?? {};

        setFormData({
          id: data.id ?? kardexId,
          fechaHora: toDateTimeLocal(selectedRow?.fechaHora),
          almacenId: data.almacenId ?? "",
          almacenDestinoId: data.almacenDestinoId ?? "",
          produccionId: data.produccionId ?? "",
          tipoMovimientoId:
            data.tipoMovimientoId ?? findIdByName(tiposMovimiento, selectedRow?.nombreTipoMovimiento),
          pedidoId: data.pedidoId ?? "",
          ordenCompraId: data.ordenCompraId ?? "",
          clienteProveedorId: data.clienteProveedorId ?? "",
          descripcion: data.descripcion ?? "",
        });

        const mapped = (data.items || []).map((it, idx) => ({
          id: it?.id ?? null,
          kardexItemId: it?.id ?? `tmp-edit-${idx}-${Date.now()}`,
          presentacionProductoId: Number(
            it?.presentacionProductoId ?? it?.presentacion_producto_id ?? it?.idPresentacionProducto ?? 0
          ),
          productoId: "",
          productoNombre: it?.productoNombre ?? it?.nombreProducto ?? it?.identificadorProducto ?? "",
          presentacionNombre: it?.presentacionNombre ?? "",
          cantidad: Number(it?.cantidad ?? 0),
          precio: Number(it?.precio ?? 0),
          lote: it?.lote || "",
          fechaVencimiento: it?.fechaVencimiento ? String(it.fechaVencimiento).substring(0, 10) : "",
          devolutivo: Boolean(it?.devolutivo ?? false),
          responsableId: it?.responsableId ? Number(it.responsableId) : null,
          estadoId: it?.estadoId ?? 1,
        }));

        setDraftItems(mapped);
        setPendingEditFallback(null);
      } catch {
        setFormData(buildFallbackFormData(selectedRow, kardexId));
        setPendingEditFallback({ kardexId, selectedRow });

        try {
          const itemsRes = await axios.get(`/v1/kardex/${kardexId}/items`, {
            ...headers,
            params: { page: 0, size: 200, sort: "id,desc" },
          });
          const content = pickList(itemsRes);
          const mapped = content.map((it, idx) => ({
            id: it?.id ?? null,
            kardexItemId: it?.id ?? `tmp-fallback-${idx}-${Date.now()}`,
            presentacionProductoId: Number(
              it?.presentacionProductoId ?? it?.presentacion_producto_id ?? it?.idPresentacionProducto ?? 0
            ),
            productoId: "",
            productoNombre: it?.productoNombre ?? it?.nombreProducto ?? it?.identificadorProducto ?? "",
            presentacionNombre: it?.presentacionNombre ?? "",
            cantidad: Number(it?.cantidad ?? 0),
            precio: Number(it?.precio ?? 0),
            lote: it?.lote || "",
            fechaVencimiento: it?.fechaVencimiento ? String(it.fechaVencimiento).substring(0, 10) : "",
            devolutivo: Boolean(it?.devolutivo ?? false),
            responsableId: it?.responsableId ? Number(it.responsableId) : null,
            estadoId: it?.estadoId ?? 1,
          }));
          setDraftItems(mapped);
        } catch {
          setDraftItems([]);
        }
      }
    };

    loadEditData();
  }, [open, formMode, selectedRow]);

  useEffect(() => {
    if (!open || formMode !== "edit" || !pendingEditFallback) return;

    setFormData((prev) => buildFallbackFormData(pendingEditFallback.selectedRow, pendingEditFallback.kardexId, prev));

    if (
      tiposMovimiento.length > 0 &&
      almacenes.length > 0 &&
      producciones.length > 0 &&
      empresas.length > 0
    ) {
      setPendingEditFallback(null);
    }
  }, [open, formMode, pendingEditFallback, tiposMovimiento, almacenes, producciones, empresas]);

  useEffect(() => {
    if (!open || !isEntradaUi || !formData.pedidoId) {
      setOrdenesCompraByPedido([]);
      return;
    }

    const localFiltered = ordenesCompra.filter((oc) => String(getPedidoIdFromOc(oc)) === String(formData.pedidoId));
    if (localFiltered.length) {
      setOrdenesCompraByPedido(localFiltered);
      return;
    }

    const fetchByPedido = async () => {
      try {
        const res = await axios.get(`/v1/orden-compra/pedido/${Number(formData.pedidoId)}/lookup`, headers);
        setOrdenesCompraByPedido(pickList(res));
      } catch {
        setOrdenesCompraByPedido([]);
      }
    };

    fetchByPedido();
  }, [open, isEntradaUi, formData.pedidoId, ordenesCompra]);

  useEffect(() => {
    if (!open || !startInArticles || formMode !== "edit") return;
    setArticleModalOpen(true);
  }, [open, startInArticles, formMode]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    if (pendingEditFallback) {
      setPendingEditFallback(null);
    }
    const numeric = [
      "almacenId",
      "almacenDestinoId",
      "produccionId",
      "tipoMovimientoId",
      "pedidoId",
      "ordenCompraId",
      "clienteProveedorId",
    ];
    const castValue = numeric.includes(name) && value !== "" ? Number(value) : value;

    setFormData((prev) => {
      const next = { ...prev, [name]: castValue };
      if (name === "almacenId" && String(next.almacenDestinoId) === String(castValue)) {
        next.almacenDestinoId = "";
      }
      if (name === "pedidoId") next.ordenCompraId = "";
      if (name === "tipoMovimientoId") {
        const tipoSel = tiposMovimiento.find((t) => String(t.id) === String(castValue));
        const esEntrada = normalize(renderName(tipoSel)).includes("entrada");
        const esTraslado =
          normalize(renderName(tipoSel)).includes("traslado") ||
          normalize(renderName(tipoSel)).includes("transfer");
        if (!esEntrada) {
          next.pedidoId = "";
          next.ordenCompraId = "";
        }
        if (!esTraslado) {
          next.almacenDestinoId = "";
        }
      }
      return next;
    });

    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
      ...(name === "tipoMovimientoId" ? { almacenDestinoId: undefined } : {}),
    }));
  };

  const applyLookupSelection = () => {
    if (!lookupSelectedRow) return;

    if (lookupType === "produccion") {
      setFormData((prev) => ({ ...prev, produccionId: Number(lookupSelectedRow.id) }));
    } else if (lookupType === "pedido") {
      setFormData((prev) => ({
        ...prev,
        pedidoId: Number(lookupSelectedRow.id),
        ordenCompraId: "",
      }));
    } else if (lookupType === "producto") {
      setArticleFormData((prev) => ({
        ...prev,
        productoId: Number(lookupSelectedRow.id),
        productoNombre: renderName(lookupSelectedRow),
        presentacionProductoId: "",
        presentacionNombre: "",
        devolutivo: false,
        responsableId: null,
      }));
    } else if (lookupType === "presentacion") {
      const productoId = getProductoIdFromPresentacionObj(lookupSelectedRow);
      if (productoId && String(productoId) !== String(articleFormData?.productoId ?? "")) {
        setMessage({
          open: true,
          severity: "warning",
          text: "La presentación seleccionada no pertenece al producto elegido.",
        });
        return;
      }
      const devolutivo = isPresentacionDevolutiva(lookupSelectedRow);
      setArticleFormData((prev) => ({
        ...prev,
        productoId: prev.productoId,
        presentacionProductoId: Number(lookupSelectedRow.id),
        presentacionNombre: renderPresentacion(lookupSelectedRow),
        devolutivo,
        responsableId: devolutivo ? prev?.responsableId : null,
      }));
    }

    setLookupOpen(false);
  };

  const mapDraftItemsToPayload = (resolveDevolutivoByPresentacionId) => {
    const rows = draftItems || [];
    const unique = new Map();
    rows.forEach((it) => {
      const key =
        toNumericIdOrNull(it?.id) != null
          ? `id:${toNumericIdOrNull(it?.id)}`
          : `new:${String(it?.presentacionProductoId ?? "")}|${String(it?.cantidad ?? "")}|${String(
              it?.precio ?? ""
            )}|${String(it?.lote ?? "")}|${String(it?.fechaVencimiento ?? "")}|${String(
              toNumericIdOrNull(it?.responsableId) ?? ""
            )}|${String(Boolean(it?.devolutivo))}`;
      unique.set(key, it);
    });

    return Array.from(unique.values()).map((it) => {
      const presentacionProductoId = Number(it?.presentacionProductoId ?? 0);
      const resolvedDevolutivo =
        typeof resolveDevolutivoByPresentacionId === "function"
          ? Boolean(
              resolveDevolutivoByPresentacionId(
                presentacionProductoId,
                Boolean(it?.devolutivo ?? false)
              )
            )
          : Boolean(it?.devolutivo ?? false);
      const mapped = {
        presentacionProductoId,
        cantidad: Number(it?.cantidad ?? 0),
        precio: Number(it?.precio ?? 0),
        devolutivo: resolvedDevolutivo,
        responsableId: resolvedDevolutivo ? toNumericIdOrNull(it?.responsableId) : null,
        lote: it?.lote || null,
        fechaVencimiento: it?.fechaVencimiento ? String(it.fechaVencimiento).substring(0, 10) : null,
      };
      const parsedId = toNumericIdOrNull(it?.id);
      if (parsedId != null) {
        mapped.id = parsedId;
      }
      return mapped;
    });
  };

  const buildHeaderPayload = () => ({
    tipoMovimientoId: formData.tipoMovimientoId ? Number(formData.tipoMovimientoId) : null,
    almacenId: formData.almacenId ? Number(formData.almacenId) : null,
    almacenDestinoId:
      isTrasladoUi && formData.almacenDestinoId ? Number(formData.almacenDestinoId) : null,
    pedidoId: formData.pedidoId ? Number(formData.pedidoId) : null,
    ordenCompraId: formData.ordenCompraId ? Number(formData.ordenCompraId) : null,
    produccionId: formData.produccionId ? Number(formData.produccionId) : null,
    clienteProveedorId: formData.clienteProveedorId ? Number(formData.clienteProveedorId) : null,
    descripcion: formData.descripcion || null,
  });

  const handleNext = async () => {
    try {
      await kardexSchema.validate(formData, { abortEarly: false });
      if (isTrasladoUi && !formData.almacenDestinoId) {
        setErrors((prev) => ({ ...prev, almacenDestinoId: "Almacen destino obligatorio para traslados." }));
        return;
      }
      setErrors({});
      setOpen(false);
      setArticleModalOpen(true);
    } catch (err) {
      if (err.name === "ValidationError") {
        const map = {};
        err.inner.forEach((e) => {
          if (e.path && !map[e.path]) map[e.path] = e.message;
        });
        setErrors(map);
      }
    }
  };

  const handleOpenCreateArticle = () => {
    setArticleFormMode("create");
    setArticleFormData(newArticleDraft());
    setArticleFormOpen(true);
  };

  const handleOpenEditArticle = () => {
    if (!articleSelectedRow) return;
    const selectedKey = String(articleSelectedRow?.id ?? articleSelectedRow?.kardexItemId ?? "");
    const latestRow =
      draftItems.find((it) => String(it?.id ?? it?.kardexItemId ?? "") === selectedKey) ?? articleSelectedRow;
    const productoId = getProductoIdFromPresentacion(latestRow.presentacionProductoId);
    const devolutivoFromPresentacion = getDevolutivoByPresentacionId(
      latestRow.presentacionProductoId,
      latestRow?.devolutivo
    );

    setArticleFormMode("edit");
    setArticleFormData({
      ...newArticleDraft(),
      ...latestRow,
      productoId: productoId || "",
      cantidad: latestRow?.cantidad ?? "",
      precio: latestRow?.precio ?? "",
      lote: latestRow?.lote ?? "",
      devolutivo: Boolean(devolutivoFromPresentacion),
      responsableId: devolutivoFromPresentacion ? toNumericIdOrNull(latestRow?.responsableId) : null,
      fechaVencimiento: latestRow?.fechaVencimiento
        ? String(latestRow.fechaVencimiento).substring(0, 10)
        : "",
    });
    setArticleFormOpen(true);

    if (!productoId && latestRow?.presentacionProductoId) {
      fetchProductoIdByPresentacion(latestRow.presentacionProductoId).then((pid) => {
        if (pid) {
          setArticleFormData((prev) => ({ ...prev, productoId: Number(pid) }));
        }
      });
    }
  };

  const handleDeleteArticle = () => {
    if (!articleSelectedRow) return;
    const key = articleSelectedRow?.id ?? articleSelectedRow?.kardexItemId;
    setDraftItems((prev) => prev.filter((it) => (it?.id ?? it?.kardexItemId) !== key));
    setArticleSelectedRow(null);
  };

  const handleArticleFormChange = (e) => {
    const { name, value } = e.target;
    setArticleFormData((prev) => {
      const next = { ...prev };

      if (name === "productoId") {
        next.productoId = value === "" ? "" : Number(value);
        next.presentacionProductoId = "";
        next.devolutivo = false;
        next.responsableId = null;
      } else if (["presentacionProductoId", "cantidad", "precio"].includes(name)) {
        next[name] = value === "" ? "" : Number(value);
        if (name === "presentacionProductoId") {
          const pres = (presentaciones || []).find(
            (p) => String(getPresentacionId(p)) === String(next.presentacionProductoId)
          );
          next.devolutivo = isPresentacionDevolutiva(pres);
          next.responsableId = null;
        }
      } else if (name === "responsableId") {
        next.responsableId = value === "" ? null : Number(value);
      } else {
        next[name] = value;
      }

      return next;
    });
  };

  const handleSaveArticleDraft = async () => {
    const presentacionProductoId = Number(articleFormData.presentacionProductoId || 0);
    const cantidad = Number(articleFormData.cantidad || 0);
    const precio = Number(articleFormData.precio || 0);

    if (!presentacionProductoId || cantidad <= 0 || Number.isNaN(precio) || precio < 0) {
      setMessage({
        open: true,
        severity: "warning",
        text: "Debes diligenciar presentacion, cantidad y precio validos.",
      });
      return;
    }

    let devolutivo = Boolean(
      articleFormData?.devolutivo ?? isPresentacionDevolutiva(presentacionSeleccionada)
    );
    const detallePresentacion = await fetchPresentacionDetalle(presentacionProductoId);
    if (detallePresentacion) {
      devolutivo = isPresentacionDevolutiva(detallePresentacion);
      setArticleFormData((prev) => ({
        ...prev,
        devolutivo,
        responsableId: devolutivo ? prev?.responsableId : null,
      }));
    }
    if (devolutivo && !toNumericIdOrNull(articleFormData?.responsableId)) {
      setMessage({
        open: true,
        severity: "warning",
        text: "La presentacion seleccionada es devolutiva y requiere responsable asignado.",
      });
      return;
    }

    const payload = {
      ...articleFormData,
      productoNombre: selectedProductoLabel || articleFormData?.productoNombre || "",
      presentacionNombre: selectedPresentacionLabel || articleFormData?.presentacionNombre || "",
      presentacionProductoId,
      cantidad,
      precio,
      devolutivo,
      responsableId: toNumericIdOrNull(articleFormData?.responsableId),
      fechaVencimiento: articleFormData.fechaVencimiento
        ? String(articleFormData.fechaVencimiento).substring(0, 10)
        : null,
      lote: articleFormData.lote || null,
    };

    setDraftItems((prev) => {
      if (articleFormMode === "edit") {
        const key = articleFormData?.id ?? articleFormData?.kardexItemId;
        const nextRows = prev.map((it) =>
          String(it?.id ?? it?.kardexItemId) === String(key) ? { ...it, ...payload } : it
        );
        const refreshed = nextRows.find((it) => String(it?.id ?? it?.kardexItemId) === String(key)) ?? null;
        setArticleSelectedRow(refreshed);
        return nextRows;
      }
      const createdRow = {
        ...newArticleDraft(),
        ...payload,
        id: null,
        kardexItemId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        estadoId: 1,
      };
      setArticleSelectedRow(createdRow);
      return [
        ...prev,
        createdRow,
      ];
    });

    setArticleFormOpen(false);
  };

  useEffect(() => {
    if (!articleFormOpen) return;
    const ppId = articleFormData?.presentacionProductoId;
    if (!ppId) return;

    let active = true;
    fetchPresentacionDetalle(ppId).then((detalle) => {
      if (!active) return;
      const localPres = (presentaciones || []).find(
        (p) => String(getPresentacionId(p)) === String(ppId)
      );
      const devolutivo = detalle
        ? isPresentacionDevolutiva(detalle)
        : isPresentacionDevolutiva(localPres);
      setArticleFormData((prev) => ({
        ...prev,
        devolutivo,
        responsableId: devolutivo ? prev?.responsableId : null,
      }));
    });
    return () => {
      active = false;
    };
  }, [articleFormOpen, articleFormData?.presentacionProductoId, presentaciones]);

  useEffect(() => {
    if (!articleSelectedRow) return;
    const selectedKey = String(articleSelectedRow?.id ?? articleSelectedRow?.kardexItemId ?? "");
    const stillVisible = filteredDraftItems.some(
      (it) => String(it?.id ?? it?.kardexItemId ?? "") === selectedKey
    );
    if (!stillVisible) setArticleSelectedRow(null);
  }, [filteredDraftItems, articleSelectedRow]);

  const handleSaveKardex = async () => {
    if (savingKardex) return;
    if (isTrasladoUi && !formData.almacenDestinoId) {
      setMessage({
        open: true,
        severity: "warning",
        text: "Para movimientos de traslado debes seleccionar un almacen destino.",
      });
      return;
    }
    const ppIds = Array.from(
      new Set(
        (draftItems || [])
          .map((it) => toNumericIdOrNull(it?.presentacionProductoId))
          .filter((id) => id != null && id > 0)
      )
    );
    const devolutivoByPresentacionId = {};

    const pendingFetchIds = [];
    ppIds.forEach((id) => {
      const local = (presentaciones || []).find(
        (p) => String(getPresentacionId(p)) === String(id)
      );
      if (
        local &&
        (local?.desgregar !== undefined ||
          local?.desagregar !== undefined ||
          local?.devolutivo !== undefined)
      ) {
        devolutivoByPresentacionId[String(id)] = isPresentacionDevolutiva(local);
      } else {
        pendingFetchIds.push(id);
      }
    });

    if (pendingFetchIds.length) {
      const details = await Promise.allSettled(
        pendingFetchIds.map((id) => fetchPresentacionDetalle(id))
      );
      details.forEach((res, idx) => {
        if (res.status !== "fulfilled" || !res.value) return;
        const id = pendingFetchIds[idx];
        devolutivoByPresentacionId[String(id)] = isPresentacionDevolutiva(res.value);
      });
    }

    const items = mapDraftItemsToPayload((presentacionProductoId, fallback) =>
      Object.prototype.hasOwnProperty.call(
        devolutivoByPresentacionId,
        String(presentacionProductoId)
      )
        ? devolutivoByPresentacionId[String(presentacionProductoId)]
        : fallback
    );
    if (!items.length) {
      setMessage({
        open: true,
        severity: "warning",
        text: "Debes registrar al menos un articulo en el Kardex.",
      });
      return;
    }

    const missingResponsable = items.find((it) => Boolean(it?.devolutivo) && !toNumericIdOrNull(it?.responsableId));
    if (missingResponsable) {
      setMessage({
        open: true,
        severity: "warning",
        text: "Hay articulos devolutivos sin responsable asignado. Completa ese dato antes de guardar.",
      });
      return;
    }

    const payload = {
      ...buildHeaderPayload(),
      items,
    };

    try {
      setSavingKardex(true);
      const requestConfig = { ...headers, timeout: 45000 };
      if (formMode === "edit") {
        await axios.put(`/v1/kardex/${formData.id}`, payload, requestConfig);
      } else {
        await axios.post("/v1/kardex/movimientos", payload, requestConfig);
      }

      reloadData?.();
      setMessage({
        open: true,
        severity: "success",
        text: `Kardex ${formMode === "edit" ? "actualizado" : "creado"} correctamente.`,
      });

      setArticleModalOpen(false);
      setArticleFormOpen(false);
      setOpen(false);
      setSelectedRow(null);
    } catch (err) {
      const isTimeout =
        err?.code === "ECONNABORTED" ||
        String(err?.message ?? "").toLowerCase().includes("timeout");
      setMessage({
        open: true,
        severity: "error",
        text: isTimeout
          ? "El servidor tardó demasiado en responder al guardar. Intenta nuevamente."
          : extractApiMessage(err, "Error al guardar Kardex."),
      });
    } finally {
      setSavingKardex(false);
    }
  };

  return (
    <Box>
      <Dialog open={open && !startInArticles} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{formMode === "edit" ? "Editar Kardex" : "Crear Kardex"}</DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha/Hora"
                type="datetime-local"
                name="fechaHora"
                value={formData.fechaHora}
                onChange={handleHeaderChange}
                error={!!errors.fechaHora}
                helperText={errors.fechaHora}
                fullWidth
                sx={{ mt: 0.5 }}
                InputLabelProps={{
                  shrink: true,
                  sx: { transform: "translate(14px, -6px) scale(0.75)" },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.tipoMovimientoId} sx={{ mt: 0.5 }}>
                <InputLabel>Tipo Movimiento</InputLabel>
                <Select
                  name="tipoMovimientoId"
                  label="Tipo Movimiento"
                  value={formData.tipoMovimientoId}
                  onChange={handleHeaderChange}
                  disabled={formMode === "edit"}
                >
                  <MenuItem value="">
                    <em>Seleccione...</em>
                  </MenuItem>
                  {tiposMovimiento.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {renderName(t)}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errors.tipoMovimientoId}</FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.almacenId}>
                <InputLabel>Almacen</InputLabel>
                <Select name="almacenId" label="Almacen" value={formData.almacenId} onChange={handleHeaderChange}>
                  <MenuItem value="">
                    <em>Seleccione...</em>
                  </MenuItem>
                  {almacenes.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {renderName(a)}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errors.almacenId}</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Produccion"
                value={selectedProduccionLabel}
                error={!!errors.produccionId}
                helperText={errors.produccionId}
                inputProps={{ readOnly: true }}
                onClick={() => openLookup("produccion")}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton edge="end" onClick={() => openLookup("produccion")}>
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {isTrasladoUi && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!errors.almacenDestinoId}>
                  <InputLabel>Almacen Destino</InputLabel>
                  <Select
                    name="almacenDestinoId"
                    label="Almacen Destino"
                    value={formData.almacenDestinoId}
                    onChange={handleHeaderChange}
                  >
                    <MenuItem value="">
                      <em>Seleccione...</em>
                    </MenuItem>
                    {almacenes
                      .filter((a) => String(a?.id) !== String(formData.almacenId))
                      .map((a) => (
                        <MenuItem key={a.id} value={a.id}>
                          {renderName(a)}
                        </MenuItem>
                      ))}
                  </Select>
                  <FormHelperText>{errors.almacenDestinoId}</FormHelperText>
                </FormControl>
              </Grid>
            )}

            {isEntradaUi && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Pedido"
                    value={selectedPedidoLabel}
                    inputProps={{ readOnly: true }}
                    onClick={() => openLookup("pedido")}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton edge="end" onClick={() => openLookup("pedido")}>
                            <SearchIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!formData.pedidoId}>
                    <InputLabel>Orden de Compra</InputLabel>
                    <Select
                      name="ordenCompraId"
                      label="Orden de Compra"
                      value={formData.ordenCompraId}
                      onChange={handleHeaderChange}
                    >
                      <MenuItem value="">
                        <em>{formData.pedidoId ? "Sin orden asociada" : "Seleccione pedido primero"}</em>
                      </MenuItem>
                      {ordenesCompraFiltradas.map((o) => (
                        <MenuItem key={o.id} value={o.id}>
                          {renderName(o)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Cliente / Proveedor</InputLabel>
                <Select
                  name="clienteProveedorId"
                  label="Cliente / Proveedor"
                  value={formData.clienteProveedorId}
                  onChange={handleHeaderChange}
                >
                  <MenuItem value="">
                    <em>Sin cliente/proveedor</em>
                  </MenuItem>
                  {empresas.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {renderName(e)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                label="Descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleHeaderChange}
                error={!!errors.descripcion}
                helperText={errors.descripcion}
                minRows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleNext}>Siguiente</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={articleModalOpen}
        onClose={() => {
          setArticleModalOpen(false);
          if (startInArticles) setOpen(false);
        }}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Articulos del Kardex</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <GridActionBar
            onAdd={handleOpenCreateArticle}
            onUpdate={handleOpenEditArticle}
            onDelete={handleDeleteArticle}
            canUpdate={Boolean(articleSelectedRow)}
            canDelete={Boolean(articleSelectedRow)}
            labels={{ add: "Agregar", update: "Actualizar", delete: "Anular" }}
            onFilters={() => setArticleFiltersOpen(true)}
            onClearFilters={() => setArticleFilters(DEFAULT_ARTICLE_FILTERS)}
            hasActiveFilters={hasActiveArticleFilters}
          />

          <GridArticuloKardex
            items={filteredDraftItems}
            presentaciones={presentaciones}
            productos={productos}
            selectedRow={articleSelectedRow}
            setSelectedRow={setArticleSelectedRow}
          />
        </DialogContent>

        <DialogActions>
          {!startInArticles && (
            <Button
              onClick={() => {
                setArticleModalOpen(false);
                setOpen(true);
              }}
            >
              Volver
            </Button>
          )}
          <Button
            onClick={() => {
              setArticleModalOpen(false);
              if (startInArticles) setOpen(false);
            }}
          >
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSaveKardex} disabled={savingKardex}>
            {savingKardex ? "Guardando..." : "Guardar Kardex"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={articleFormOpen} onClose={() => setArticleFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{articleFormMode === "edit" ? "Actualizar Articulo" : "Agregar Articulo"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Producto"
                value={selectedProductoLabel}
                inputProps={{ readOnly: true }}
                onClick={() => openLookup("producto")}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton edge="end" onClick={() => openLookup("producto")}>
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Presentacion"
                value={selectedPresentacionLabel}
                inputProps={{ readOnly: true }}
                onClick={() => openLookup("presentacion")}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton edge="end" onClick={() => openLookup("presentacion")}>
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                name="cantidad"
                label="Cantidad"
                type="number"
                value={articleFormData.cantidad}
                onChange={handleArticleFormChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                name="precio"
                label="Precio Unitario"
                type="number"
                value={articleFormData.precio}
                onChange={handleArticleFormChange}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                name="precioTotal"
                label="Precio Total"
                value={Number(articleFormData.cantidad || 0) * Number(articleFormData.precio || 0)}
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                name="fechaVencimiento"
                label="Fecha de Vencimiento"
                value={articleFormData.fechaVencimiento || ""}
                onChange={handleArticleFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="lote"
                label="Lote"
                value={articleFormData.lote || ""}
                onChange={handleArticleFormChange}
              />
            </Grid>

            {Boolean(articleFormData?.devolutivo) && (
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id="kdx-art-responsable-label">Responsable</InputLabel>
                  <Select
                    labelId="kdx-art-responsable-label"
                    label="Responsable"
                    name="responsableId"
                    value={articleFormData.responsableId ?? ""}
                    onChange={handleArticleFormChange}
                  >
                    <MenuItem value="">
                      <em>Seleccione...</em>
                    </MenuItem>
                    {responsables.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r?.nombre ?? r?.name ?? r?.personaNombreCompleto ?? r?.descripcion ?? `Responsable ${r?.id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setArticleFormOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveArticleDraft}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={articleFiltersOpen} onClose={() => setArticleFiltersOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Filtros de Artículos</DialogTitle>
        <DialogContent sx={{ pt: 3.5 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 2, mt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel id="kdx-art-filter-producto-label">Producto</InputLabel>
              <Select
                labelId="kdx-art-filter-producto-label"
                label="Producto"
                value={articleFilters.productoId}
                onChange={(e) => setArticleFilters((prev) => ({ ...prev, productoId: e.target.value }))}
              >
                <MenuItem value="">Todos</MenuItem>
                {articleProductoOptions.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArticleFilters(DEFAULT_ARTICLE_FILTERS)}>Limpiar</Button>
          <Button variant="contained" onClick={() => setArticleFiltersOpen(false)}>
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={lookupOpen} onClose={() => setLookupOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{lookupTitle}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth
            placeholder="Buscar..."
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            sx={{ mb: 2 }}
          />
          <AppDataGrid
            rows={lookupRows}
            columns={lookupColumns}
            selectedRow={lookupSelectedRow}
            setSelectedRow={setLookupSelectedRow}
            pageSizeOptions={[5, 10, 20]}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLookupOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!lookupSelectedRow} onClick={applyLookupSelection}>
            Seleccionar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

FormKardex.propTypes = {
  open: PropTypes.bool.isRequired,
  setOpen: PropTypes.func.isRequired,
  formMode: PropTypes.oneOf(["create", "edit"]),
  startInArticles: PropTypes.bool,
  selectedRow: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    fechaHora: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    nombreTipoMovimiento: PropTypes.string,
    nombreAlmacen: PropTypes.string,
    nombreAlmacenDestino: PropTypes.string,
    nombreProduccion: PropTypes.string,
    nombreClienteProveedor: PropTypes.string,
  }),
  reloadData: PropTypes.func,
  setMessage: PropTypes.func.isRequired,
  setSelectedRow: PropTypes.func.isRequired,
};

FormKardex.defaultProps = {
  formMode: "create",
  startInArticles: false,
  selectedRow: null,
  reloadData: undefined,
};


