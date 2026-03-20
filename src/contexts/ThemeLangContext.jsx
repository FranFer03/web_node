import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    "Features": "Features",
    "Solutions": "Solutions",
    "Documentation": "Documentation",
    "Sign up": "Sign up",
    "Industrial 4.0 Standard": "Industrial 4.0 Standard",
    "Visualize and Optimize": "Visualize and Optimize",
    "Your": "Your",
    "Network": "Network",
    "Real-time monitoring and advanced diagnostics for industrial-scale LoRa networks.": "Real-time monitoring and advanced diagnostics for industrial-scale LoRa networks.",
    "Start Monitoring": "Start Monitoring",
    "Watch Demo": "Watch Demo",
    "Infinite Scalability": "Infinite Scalability",
    "Support for thousands of nodes across vast areas without degradation.": "Support for thousands of nodes across vast areas without degradation.",
    "Real-time Data": "Real-time Data",
    "Instant latency tracking and packet delivery metrics with sub-second updates.": "Instant latency tracking and packet delivery metrics with sub-second updates.",
    "Historical Analysis": "Historical Analysis",
    "Deep trend analysis to predict failures before they occur.": "Deep trend analysis to predict failures before they occur.",
    "Ready to optimize your network?": "Ready to optimize your network?",
    "Enter your work email to receive a customized implementation plan.": "Enter your work email to receive a customized implementation plan.",
    "Enter your work email": "Enter your work email",
    "Get Consulted": "Get Consulted",
    "Privacy Policy": "Privacy Policy",
    "Terms of Service": "Terms of Service",
    "API Keys": "API Keys",
    "Change language": "Change language",
    "Change theme": "Change theme",
    "LogoutLabel": "Logout",
    "Welcome Back": "Welcome Back",
    "Access your mesh network dashboard": "Access your mesh network dashboard",
    "Usuario": "Username",
    "Contrasena": "Password",
    "Sign In": "Sign In",
    "Ingresando...": "Signing in...",
    "Credenciales invalidas": "Invalid credentials",
    "Error al conectar con la API": "Error connecting to the API",
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
    "Panel de nodos": "Nodes Panel",
    "Informacion general de nodos": "General node information",
    "Gestor de nodos": "Node Manager",
    "Panel de Nodos": "Nodes Panel",
    "Mapa en Vivo": "Live Map",
    "Históricos": "Historical",
    "Log de Paquetes": "Packet Log",
    "Buscar nodos, IPs...": "Search nodes, IPs...",
    "Configuración": "Settings",
    "Cerrar Sesión": "Logout"
  },
  es: {
    "Features": "Características",
    "Solutions": "Soluciones",
    "Documentation": "Documentación",
    "Sign up": "Registrarse",
    "Industrial 4.0 Standard": "Estándar Industrial 4.0",
    "Visualize and Optimize": "Visualiza y Optimiza",
    "Your": "Tu",
    "Network": "Red",
    "Real-time monitoring and advanced diagnostics for industrial-scale LoRa networks.": "Monitoreo en tiempo real y diagnóstico avanzado para redes LoRa a escala industrial.",
    "Start Monitoring": "Comenzar Monitoreo",
    "Watch Demo": "Ver Demo",
    "Infinite Scalability": "Escalabilidad Infinita",
    "Support for thousands of nodes across vast areas without degradation.": "Soporte para miles de nodos en grandes áreas sin degradación.",
    "Real-time Data": "Datos en Tiempo Real",
    "Instant latency tracking and packet delivery metrics with sub-second updates.": "Seguimiento instantáneo de latencia y métricas de entrega de paquetes con actualizaciones sub-segundo.",
    "Historical Analysis": "Análisis Histórico",
    "Deep trend analysis to predict failures before they occur.": "Análisis profundo de tendencias para predecir fallos antes de que ocurran.",
    "Ready to optimize your network?": "¿Listo para optimizar tu red?",
    "Enter your work email to receive a customized implementation plan.": "Ingresa tu correo laboral para recibir un plan de implementación personalizado.",
    "Enter your work email": "Ingresa tu correo laboral",
    "Get Consulted": "Solicitar Asesoría",
    "Privacy Policy": "Política de Privacidad",
    "Terms of Service": "Términos del Servicio",
    "API Keys": "Claves API",
    "Change language": "Cambiar idioma",
    "Change theme": "Cambiar tema",
    "LogoutLabel": "Cerrar Sesión",
    "Welcome Back": "Bienvenido de nuevo",
    "Access your mesh network dashboard": "Accede al panel de tu red mesh",
    "Usuario": "Usuario",
    "Contrasena": "Contrasena",
    "Sign In": "Iniciar sesion",
    "Ingresando...": "Ingresando...",
    "Credenciales invalidas": "Credenciales invalidas",
    "Error al conectar con la API": "Error al conectar con la API",
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
    "Panel de nodos": "Panel de nodos",
    "Informacion general de nodos": "Informacion general de nodos",
    "Gestor de nodos": "Gestor de nodos",
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
