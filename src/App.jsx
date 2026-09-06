/*=============================================================================
Nombre del archivo : App.jsx
Descripcion        : Reestructuracion de paises
===============================================================================
CONTROL DE CAMBIOS
+------------+---------+----------------------+-----------------------------+
|   Fecha    | Version |      Autor           | Descripcion del cambio      |
+------------+---------+----------------------+-----------------------------+
| 2026-06-03 | 0.4.0   | Jeisson Sanchez      |  Reestructuracion de paises.       |
+------------+---------+----------------------+-----------------------------+
=============================================================================*/
import React, { useEffect, useState } from "react";
import { Box, CssBaseline, Container, Toolbar, Paper } from "@mui/material";

import { useThemeToggle } from "./components/dashboard/ThemeToggleProvider";
import { useTranslation } from "react-i18next";
import "./i18n.js";
import "./index.css";
import { useLocation, useNavigate } from "react-router-dom";

import AppBarComponent from "./components/dashboard/AppBarComponent.jsx";
import Copyright from "./components/dashboard/Copyright";
import Inicio from "./components/Inicio.jsx";
import Contenido from "./components/dashboard/Contenido.jsx";
import Navigator2 from "./components/dashboard/Navigator2.jsx";

// MÃ³dulos
import Persona from "./components/personas/Persona.jsx";
import LocalizacionGeografica from "./components/localizacion_geografica/LocalizacionGeografica";
import Presentacionproducto from "./components/Presentacionproducto/Presentacionproducto.jsx";
import Produccion from "./components/produccion/Produccion";
import Empresa from "./components/empresas/Empresa.jsx";
import Producto from "./components/producto/Producto.jsx";
import ProductoCategoria from "./components/producto_categoria/ProductoCategoria.jsx";
import Almacen from "./components/almacen/Almacen.jsx";
import Espacio from "./components/espacio/Espacio.jsx";
import Bloque from "./components/bloque/Bloque.jsx";
import Sede from "./components/sede/Sede.jsx";
import Marca from "./components/marca/Marca.jsx";
import Unidad from "./components/unidad/Unidad.jsx";
import TipoMovimiento from "./components/tipo_movimiento/TipoMovimiento.jsx";
import TipoProduccion from "./components/tipo_produccion/TipoProduccion.jsx";
import Presentacion from "./components/Presentacion/Presentacion.jsx";
import TipoBloque from "./components/tipo_bloque/Tipobloque.jsx";
import TipoSedes from "./components/tipo_sede/TipoSede.jsx";
import TipoEspacio from "./components/tipo_espacio/TipoEspacio.jsx";
import RPedido from "./components/r_pedido/Pedido.jsx";
import kardex from "./components/Kardex/kardex.jsx";
import Rol from "./components/Rol/Rol.jsx";
import TipoIdentificacion from "./components/TipoIdentificacion/TipoIdentificacion.jsx";
import Proveedor from "./components/Proveedor/Proveedor.jsx";
import MediaCard from "./components/MediaCard.jsx";
import OrdenCompra from "./components/OrdenCompra/OrdenCompra.jsx";
import Ocupacion from "./components/ocupacion/Ocupacion.jsx";
import EvaluacionItem from "./components/Evaluacion_item/Evaluacion_item.jsx";
import Grupo from "./components/Grupo/Grupo.jsx";
import Movimineto from "./components/Movimiento/Movimiento.jsx";
import Proceso from "./components/Proceso/Proceso.jsx";
import Ingrediente from "./components/ingrediente/ingrediente.jsx";
import Seccion from "./components/seccion/Seccion.jsx";
import Subseccion from "./components/subseccion/subseccion.jsx";
import TipoInventario from "./components/tipo_inventario/Tipo_inventario.jsx";
import Inventario from "./components/Inventario/Inventario.jsx";
import IngredientePresentacionProducto from "./components/IngredientePP/IngredientePP.jsx";
import TipoEvaluacion from "./components/tipo-evaluacion/Tipo_evaluacion.jsx";
import Re_pedido from "./components/RE_pedido/re_pv.jsx";
import RE_kardex from "./components/RKardex/Rkardex.jsx";
import RE_productoVencimiento from "./components/RE_pv/re_pvn.jsx";
import RE_ordenCompra from "./components/RE_oc/re_oc.jsx";
import RE_fc from "./components/RE_fc/re_fc.jsx";
import Verify from "./components/Verify.jsx";
import FormRegistroPersona from "./components/seguridad/FormRegistroPersona";
import FormRegistroEmpresa from "./components/seguridad/FormRegistroEmpresa.jsx";
import ChangePasswordInitial from "./components/seguridad/ChangePasswordInitial.jsx";
import Modulo from "./components/modulo/modulos.jsx";

const moduleMap = {
  persona: Persona,
  localizacion_geografica: LocalizacionGeografica,
  presentacion_producto: Presentacionproducto,
  produccion: Produccion,
  empresa: Empresa,
  producto: Producto,
  producto_categoria: ProductoCategoria,
  almacen: Almacen,
  espacio: Espacio,
  bloque: Bloque,
  sede: Sede,
  marca: Marca,
  unidad: Unidad,
  tipo_movimiento: TipoMovimiento,
  tipo_produccion: TipoProduccion,
  presentacion: Presentacion,
  tipo_bloque: TipoBloque,
  tipo_sede: TipoSedes,
  tipo_espacio: TipoEspacio,
  r_pedido: RPedido,
  kardex: kardex,
  rol: Rol,
  tipoidentificacion: TipoIdentificacion,
  proveedor: Proveedor,
  media_card: MediaCard,
  ordencompra: OrdenCompra,
  ocupacion: Ocupacion,
  evaluacion_item: EvaluacionItem,
  grupo: Grupo,
  movimiento: Movimineto,
  proceso: Proceso,
  ingrediente: Ingrediente,
  seccion: Seccion,
  subseccion: Subseccion,
  tipo_inventario: TipoInventario,
  inventario: Inventario,
  ingredientepresentacionproducto: IngredientePresentacionProducto,
  tipo_evaluacion: TipoEvaluacion,
  re_pedido: Re_pedido,
  re_kardex: RE_kardex,
  re_productovencimiento: RE_productoVencimiento,
  re_ordencompra: RE_ordenCompra,
  re_fc: RE_fc,
  modulo: Modulo,
};

const APPBAR_GREEN = "#0F2327";
const APPBAR_HEIGHT = 72;

const App = () => {
  useTranslation();
  useThemeToggle();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentModule, setCurrentModule] = useState(null);
  const hasValidToken = () => {
    const token = localStorage.getItem("token");
    const exp = Number(localStorage.getItem("token_expiration"));
    return Boolean(token && exp && Date.now() < exp);
  };

  const [isAuthenticated, setIsAuthenticated] = useState(hasValidToken());
  const [menuOpen, setMenuOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved ? JSON.parse(saved) : true;
  });
  useEffect(() => {
    const timers = [50, 180, 320].map((ms) =>
      setTimeout(() => window.dispatchEvent(new Event("resize")), ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [menuOpen]);
  useEffect(() => {
    const hasValidToken = () => {
      const token = localStorage.getItem("token");
      const exp = Number(localStorage.getItem("token_expiration"));
      return Boolean(token && exp && Date.now() < exp);
    };

    // ðŸ”¹ VERIFY (PÃšBLICO)
    if (/\/auth\/verify(?:\/|$)/.test(location.pathname)) {
      setIsAuthenticated(false);
      setCurrentModule(<Verify key={location.search} />);
      return;
    }

    // ðŸ”¹ SIN TOKEN
    if (!hasValidToken()) {
      localStorage.removeItem("token");
      localStorage.removeItem("token_expiration");
      localStorage.removeItem("activeModule");

      setIsAuthenticated(false);
      setCurrentModule(<Inicio setCurrentModule={setCurrentModule} />);
      return;
    }

    setIsAuthenticated(true);

    // ðŸ”¥ ONBOARDING PERSONA
    if (location.pathname === "/inventario/onboarding/persona") {
      setCurrentModule(
        <FormRegistroPersona setCurrentModule={setCurrentModule} />,
      );
      return;
    }

    // ðŸ”¥ ONBOARDING EMPRESA
    if (location.pathname === "/inventario/onboarding/empresa") {
      setCurrentModule(
        <FormRegistroEmpresa setCurrentModule={setCurrentModule} />,
      );
      return;
    }

    // ðŸ”¥ CAMBIO PASSWORD INICIAL
    if (location.pathname === "/inventario/auth/change-password-initial") {
      setCurrentModule(<ChangePasswordInitial />);
      return;
    }

    // ðŸ”¹ DASHBOARD PRINCIPAL
    if (location.pathname === "/" || location.pathname === "/inventario") {
      setCurrentModule(<Contenido setCurrentModule={setCurrentModule} />);
    }
  }, [location.pathname]);

  const isOnboarding =
    location.pathname.startsWith("/inventario/onboarding") ||
    location.pathname.startsWith("/inventario/auth");

  const isPublic = !isAuthenticated || isOnboarding;

  //const isPublic = !isAuthenticated;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <CssBaseline />

      {/* MenÃº solo si estÃ¡ autenticado */}
      {isAuthenticated && !isOnboarding && (
        <Navigator2
          setCurrentModuleItem={setCurrentModule}
          setMenuOpen={setMenuOpen}
          isAuthenticated={isAuthenticated}
        />
      )}

      <Box
        id="app-main"
        component="main"
        sx={{
          flexGrow: 1,
          width: isAuthenticated
            ? {
                xs: "100%",
                sm: menuOpen ? "calc(100% - 220px)" : "calc(100% - 70px)",
                md: menuOpen ? "calc(100% - 250px)" : "calc(100% - 70px)",
              }
            : "100%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          ml: isAuthenticated
            ? {
                xs: 0,
                sm: menuOpen ? "220px" : "70px",
                md: menuOpen ? "250px" : "70px",
              }
            : 0,
          transition:
            "margin-left 0.42s cubic-bezier(0.22, 1, 0.36, 1), width 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
          bgcolor: "transparent",
        }}
      >
        <AppBarComponent
          key={isAuthenticated}
          setCurrentModule={setCurrentModule}
          setIsAuthenticated={setIsAuthenticated}
          isAuthenticated={isAuthenticated}
        />

        <Toolbar
          disableGutters
          sx={{
            minHeight: `${APPBAR_HEIGHT}px`,
            bgcolor: APPBAR_GREEN,
            boxShadow: "none",
            border: 0,
          }}
        />

        {isPublic ? (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {currentModule}
            <Box sx={{ py: 2 }}>
              <Copyright />
            </Box>
          </Box>
        ) : (
          <Container
            maxWidth={false}
            disableGutters
            sx={{
              flex: 1,
              width: "100%",
              maxWidth: "100% !important",
              pt: { xs: 2, sm: 2.25, md: 1.5 },
              pb: { xs: 9.5, sm: 3, md: 2 },
              px: { xs: 1, sm: 2, md: 3 },
              display: "flex",
              flexDirection: "column",
              bgcolor: "transparent",
            }}
          >
            <Box
              sx={{
                flex: { xs: "0 0 auto", sm: 1 },
                width: "100%",
                minWidth: 0,
                minHeight: {
                  xs: "auto",
                  sm: "calc(100vh - 185px)",
                  md: "calc(100vh - 170px)",
                },
                overflow: { xs: "visible", sm: "auto" },
                bgcolor: "transparent",
              }}
            >
              {currentModule}
            </Box>
            <Box
              sx={{ pt: { xs: 1.5, sm: 2.25, md: 2 }, pb: { xs: 1.25, sm: 0 } }}
            >
              <Copyright />
            </Box>
          </Container>
        )}
      </Box>
    </Box>
  );
};

export default App;
