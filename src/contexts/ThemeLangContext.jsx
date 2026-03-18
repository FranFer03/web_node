import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    "Industrial Mesh Control": "Industrial Mesh Control",
    "Real-time monitoring and deployment of LoRa-based sensor nodes.": "Real-time monitoring and deployment of LoRa-based sensor nodes.",
    "Active Network Nodes": "Active Network Nodes",
    "Provision New Node": "Provision New Node",
    "Edit Node Configuration": "Edit Node Configuration",
    "Node Model": "Node Model",
    "Refresh Rate (seconds)": "Refresh Rate (seconds)",
    "Deploy Node to Mesh": "Deploy Node to Mesh",
    "Save Changes": "Save Changes",
    "Cancel": "Cancel",
    "Editar": "Edit",
    "Eliminar": "Delete",
    "Desactivar": "Deactivate",
    "Activar": "Activate",
    "Confirmar Eliminación": "Confirm Deletion",
    "Sí, Eliminar": "Yes, Delete",
    "Live Node Grid": "Live Node Grid",
    "Real-time telemetry from mesh nodes": "Real-time telemetry from mesh nodes",
    "New Node": "New Node",
    "Offline": "Offline",
    "Active": "Active",
    "nodos": "nodes",
    "Refresh": "Refresh",
    "Status": "Status",
    "Actions": "Actions",
    "Creando...": "Creating...",
    "Guardando...": "Saving...",
    "No hay nodos disponibles.": "No nodes available.",
    "Cargando nodos...": "Loading nodes...",
    "Error al cargar los datos": "Error loading data",
    "Inicio": "Home",
    "Dashboard": "Dashboard",
    "Panel de Nodos": "Nodes Panel",
    "Mapa en Vivo": "Live Map",
    "Históricos": "Historical",
    "Log de Paquetes": "Packet Log",
    "Buscar nodos, IPs...": "Search nodes, IPs...",
    "Configuración": "Settings",
    "Cerrar Sesión": "Logout"
  },
  es: {
    "Industrial Mesh Control": "Control de Malla Industrial",
    "Real-time monitoring and deployment of LoRa-based sensor nodes.": "Monitoreo en tiempo real y despliegue de nodos sensores basados en LoRa.",
    "Active Network Nodes": "Nodos de Red Activos",
    "Provision New Node": "Aprovisionar Nuevo Nodo",
    "Edit Node Configuration": "Editar Configuración del Nodo",
    "Node Model": "Modelo del Nodo",
    "Refresh Rate (seconds)": "Tasa de Refresco (segundos)",
    "Deploy Node to Mesh": "Desplegar Nodo en la Malla",
    "Save Changes": "Guardar Cambios",
    "Cancel": "Cancelar",
    "Editar": "Editar",
    "Eliminar": "Eliminar",
    "Desactivar": "Desactivar",
    "Activar": "Activar",
    "Confirmar Eliminación": "Confirmar Eliminación",
    "Sí, Eliminar": "Sí, Eliminar",
    "Live Node Grid": "Cuadrícula de Nodos en Vivo",
    "Real-time telemetry from mesh nodes": "Telemetría en tiempo real de nodos de malla",
    "New Node": "Nuevo Nodo",
    "Offline": "Inactivo",
    "Active": "Activo",
    "nodos": "nodos",
    "Refresh": "Refresco",
    "Status": "Estado",
    "Actions": "Acciones",
    "Creando...": "Creando...",
    "Guardando...": "Guardando...",
    "No hay nodos disponibles.": "No hay nodos disponibles.",
    "Cargando nodos...": "Cargando nodos...",
    "Error al cargar los datos": "Error al cargar los datos",
    "Inicio": "Inicio",
    "Dashboard": "Panel Principal",
    "Panel de Nodos": "Panel de Nodos",
    "Mapa en Vivo": "Mapa en Vivo",
    "Históricos": "Históricos",
    "Log de Paquetes": "Log de Paquetes",
    "Buscar nodos, IPs...": "Buscar nodos, IPs...",
    "Configuración": "Configuración",
    "Cerrar Sesión": "Cerrar Sesión"
  }
};

const ThemeLangContext = createContext();

export function ThemeLangProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'es');

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const changeLanguage = (lang) => setLanguage(lang);

  return (
    <ThemeLangContext.Provider value={{ theme, toggleTheme, language, changeLanguage, t }}>
      {children}
    </ThemeLangContext.Provider>
  );
}

export function useThemeLang() {
  return useContext(ThemeLangContext);
}
