// src/pages/admin/Home.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dumbbell,
  Scale,
  Search,
  Users,
  ArrowRight,
  Menu,
  X,
  MapPin,
  Phone,
  Globe,
  Clock,
  Facebook,
  Instagram,
  Youtube,
  Mail,
} from "lucide-react";
import mutantLogo from "@/assets/mutant-logo.png";

// Importar todas las vistas (Inicio eliminado)
import { CalcularIMC } from "./CalcularIMC";
import { Planes } from "./Planes";
import { PorQueElegirnos } from "./PorQueElegirnos";
import { UneteAhora } from "./UneteAhora";
import { Tienda } from "./Tienda";

export function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Función para scroll suave a secciones
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Ajuste para el header fijo
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header/Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div>
                <img
                  src={mutantLogo}
                  alt="ENERFIT"
                  className="h-14 mx-auto"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {/* Botón INICIO eliminado porque ya no existe la sección */}
              <button
                onClick={() => scrollToSection("planes")}
                className="hover:text-primary transition-colors"
              >
                PLANES
              </button>
              <button
                onClick={() => scrollToSection("tienda")}
                className="hover:text-primary transition-colors"
              >
                TIENDA
              </button>
              <button
                onClick={() => scrollToSection("imc")}
                className="hover:text-primary transition-colors flex items-center gap-2"
              >
                <Scale className="h-4 w-4" />
                CALCULAR IMC
              </button>
              <button
                onClick={() => scrollToSection("porque-elegirnos")}
                className="hover:text-primary transition-colors"
              >
                ¿POR QUÉ ELEGIRNOS?
              </button>
              <button
                onClick={() => scrollToSection("unete-ahora")}
                className="gym-gradient text-primary-foreground font-bold px-4 py-2 rounded-md"
              >
                INSCRIBIRSE
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {menuOpen && (
            <nav className="md:hidden py-4 border-t border-border mt-4">
              <div className="flex flex-col gap-4">
                {/* Botón Inicio eliminado */}
                <button
                  onClick={() => scrollToSection("unete-ahora")}
                  className="py-2 hover:text-primary transition-colors"
                >
                  Consultar
                </button>
                <button
                  onClick={() => scrollToSection("planes")}
                  className="py-2 hover:text-primary transition-colors"
                >
                  Planes
                </button>
                <button
                  onClick={() => scrollToSection("tienda")}
                  className="py-2 hover:text-primary transition-colors"
                >
                  Tienda
                </button>
                <button
                  onClick={() => scrollToSection("imc")}
                  className="py-2 hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Scale className="h-4 w-4" />
                  Calcular IMC
                </button>
                <button
                  onClick={() => scrollToSection("porque-elegirnos")}
                  className="py-2 hover:text-primary transition-colors"
                >
                  ¿Por qué elegirnos?
                </button>
                <button
                  onClick={() => scrollToSection("unete-ahora")}
                  className="gym-gradient text-primary-foreground font-bold py-2 rounded-md"
                >
                  Inscribirse
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Renderizar todas las vistas en orden (Inicio eliminado) */}
      <main>
        {/* Únete Ahora/Consultar - ahora es la primera sección */}
        <div id="unete-ahora">
          <UneteAhora />
        </div>

        {/* Planes */}
        <div id="planes">
          <Planes />
        </div>

        {/* Tienda */}
        <div id="tienda">
          <Tienda />
        </div>

        {/* IMC */}
        <div id="imc">
          <CalcularIMC />
        </div>

        {/* ¿Por qué elegirnos? */}
        <div id="porque-elegirnos">
          <PorQueElegirnos />
        </div>
      </main>

      {/* Footer Mejorado */}
      <footer className="bg-background border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Logo y Descripción */}
            <div>
              <div className="flex items-center gap-3">
                <div>
                  <img
                    src={mutantLogo}
                    alt="ENERFIT"
                    className="h-18 mx-auto"
                  />
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                Transformando vidas a través del fitness desde 2010. Tu camino
                hacia una vida más saludable y fuerte comienza aquí.
              </p>
              <div className="flex gap-4">
                <a
                  href="https://www.facebook.com/p/Mutant-Tabata-GYM-100064005673205/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="https://www.instagram.com/mutant_arsenal/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://www.tiktok.com/@mutant_cbba.bo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Contacto */}
            <div>
              <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contacto
              </h4>
              <div className="space-y-4 text-muted-foreground">
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium text-foreground mb-1">MUTANT BUNKER</p>
                    <p className="text-sm">
                      Av. San Martin entre Sucre y Bolivar, Cochabamba - Bolivia
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-medium text-foreground mb-1">MUTANT ARSENAL</p>
                    <p className="text-sm">
                      Av. Heroinas entre Av. Ayacucho y C. Nataniel Aguirre,
                      Cochabamba - Bolivia
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="font-medium">76989991</span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <a
                    href="https://mutantgym.netlify.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    https://mutantgym.netlify.app
                  </a>
                </div>
              </div>
            </div>

            {/* Horarios */}
            <div>
              <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horarios
              </h4>
              <div className="space-y-4">
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-foreground">Lunes - Viernes</span>
                    <span className="font-bold text-primary">
                      6:00 AM - 10:00 PM
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Acceso completo a todas las áreas
                  </p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-foreground">Sábados</span>
                    <span className="font-bold text-primary">
                      8:00 AM - 3:00 PM
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Horario especial de fin de semana
                  </p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-foreground">Domingos</span>
                    <span className="font-bold text-primary">
                      8:00 AM - 3:00 PM
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Horario especial de fin de semana
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Línea divisoria y derechos reservados */}
          <div className="border-t border-border mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-muted-foreground text-sm text-center md:text-left">
                © 2026 ENERFIT. Todos los derechos reservados.
              </p>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <a href="#" className="hover:text-foreground transition-colors">
                  Política de Privacidad
                </a>
                <a href="#" className="hover:text-foreground transition-colors">
                  Términos y Condiciones
                </a>
                <a href="#" className="hover:text-foreground transition-colors">
                  FAQ
                </a>
              </div>
            </div>
            {/* Nueva sección sutil y elegante con el logo de SPIDERLABS */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <span className="text-muted-foreground text-sm font-light">
                  Realizado por SPIDERLABS SYSTEMS S.R.L.
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}