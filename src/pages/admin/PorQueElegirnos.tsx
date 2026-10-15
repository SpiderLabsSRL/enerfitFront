// src/pages/admin/views/PorQueElegirnos.tsx
import { Check, MapPin } from "lucide-react";
import { useState } from "react";

// Importar las imágenes de BUNKER desde la carpeta de assets
// Ruta corregida: desde src/pages/admin/views/ a src/assets/img-bunker/
import imagen1 from "../../assets/img-bunker/imagen1.jpg";
import imagen2 from "../../assets/img-bunker/imagen2.jpg";
import imagen3 from "../../assets/img-bunker/imagen3.jpg";
import imagen4 from "../../assets/img-bunker/imagen4.jpg";
import imagen5 from "../../assets/img-arsenal/img1.jpeg";
import imagen6 from "../../assets/img-arsenal/img2.jpeg";
import imagen7 from "../../assets/img-arsenal/img3.png";
import imagen8 from "../../assets/img-arsenal/img4.jpeg";

export function PorQueElegirnos() {
  const [selectedGym, setSelectedGym] = useState<"BUNKER" | "ARSENAL">(
    "BUNKER",
  );

  const gymInfo = {
    BUNKER: {
      name: "MUTANT BUNKER",
      address: "Av. San Martin entre Sucre y Bolivar, Cochabamba - Bolivia",
      mapLink: "https://maps.app.goo.gl/7GeYA6ytZD5zmr2u7",
      // Cambiamos el orden de las imágenes: imagen4 pasa a la posición 0, imagen1 a la posición 3
      images: [imagen4, imagen2, imagen3, imagen1],
      // Las descripciones se usarán directamente en porQueElegirnos para BUNKER
    },
    ARSENAL: {
      name: "MUTANT ARSENAL",
      address:
        "Av. Heroinas entre Av. Ayacucho y C. Nataniel Aguirre, Cochabamba - Bolivia",
      mapLink: "https://maps.app.goo.gl/7GTj5mnJ5buRhAht8",
      images: [imagen5, imagen6, imagen7, imagen8],
    },
  };

  // Array de características con descripciones específicas para cada imagen
  // También intercambiamos las descripciones para que coincidan con el nuevo orden de imágenes
  const porQueElegirnos = {
    BUNKER: [
      {
        title: "Área de Fuerza y Musculación",
        description: "Equipos de última generación para entrenamiento de pecho, espalda, piernas y brazos.",
      },
      {
        title: "Área de Cardio",
        description: "Cintas de correr y equipos cardiovasculares para mejorar tu resistencia y quemar calorías.",
      },
      {
        title: "Zona de Pesas y Entrenamiento Funcional",
        description: "Espacio completo con mancuernas, máquinas y áreas para rutinas de alto rendimiento.",
      },
      {
        title: "Zona de Mancuernas",
        description: "Espacio equipado con mancuernas y bancos para el entrenamiento de fuerza y tonificación muscular.",
      },
    ],
    ARSENAL: [
      {
        title: "Área de Fuerza y Musculación",
        description: "Equipos de última generación para entrenamiento de pecho, espalda, piernas y brazos.",
      },
      {
        title: "Zona de Pesas y Entrenamiento Funcional",
        description: "Espacio completo con mancuernas, máquinas y áreas para rutinas de alto rendimiento.",
      },
      {
        title: "Zona de Mancuernas",
        description: "Espacio equipado con mancuernas y bancos para el entrenamiento de fuerza y tonificación muscular.",
      },
      {
        title: "Área de Cardio",
        description: "Cintas de correr y equipos cardiovasculares para mejorar tu resistencia y quemar calorías.",
      },
    ],
  };

  const currentGym = gymInfo[selectedGym];
  const currentFeatures = porQueElegirnos[selectedGym];

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        {/* Encabezado compacto */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            ¿Por qué elegirnos?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Instalaciones premium para tu transformación
          </p>
        </div>

        {/* Selector compacto de gimnasio */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex rounded-lg bg-secondary p-1">
            <button
              onClick={() => setSelectedGym("BUNKER")}
              className={`flex-1 py-2 rounded-md transition-all duration-200 ${
                selectedGym === "BUNKER"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              BUNKER
            </button>
            <button
              onClick={() => setSelectedGym("ARSENAL")}
              className={`flex-1 py-2 rounded-md transition-all duration-200 ${
                selectedGym === "ARSENAL"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ARSENAL
            </button>
          </div>
        </div>

        {/* Info de ubicación compacta */}
        <div className="max-w-2xl mx-auto mb-10 bg-secondary/50 backdrop-blur-sm rounded-xl p-4 border border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-sm mb-1">
                  {currentGym.name}
                </h3>
                <p className="text-muted-foreground text-xs">{currentGym.address}</p>
              </div>
            </div>
            <a
              href={currentGym.mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors duration-200 text-sm font-medium flex items-center gap-2 whitespace-nowrap"
            >
              <MapPin className="h-5 w-5 text-primary-foreground flex-shrink-0 -mt-0.5" />
              Ver en Maps
            </a>
          </div>
        </div>

        {/* Grid de características - Modificado para mostrar 2 columnas en móvil */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {currentFeatures.map((item, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-all duration-300"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={currentGym.images[index]}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/30 to-transparent" />
                <div className="absolute top-3 right-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="font-semibold mb-1 text-xs sm:text-sm">{item.title}</h3>
                <p className="text-muted-foreground text-xs">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}