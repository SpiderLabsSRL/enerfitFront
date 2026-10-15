// src/pages/admin/views/PorQueElegirnos.tsx
import { Check, MapPin } from "lucide-react";

// Importar las imágenes de ENERFIT NUTRITION desde la carpeta de assets
import imagen1 from "../../assets/img-bunker/imagen1.jpg";
import imagen2 from "../../assets/img-bunker/imagen2.jpg";
import imagen3 from "../../assets/img-bunker/imagen3.jpg";
import imagen4 from "../../assets/img-bunker/imagen4.jpg";

export function PorQueElegirnos() {
  const gymInfo = {
    name: "ENERFIT NUTRITION",
    address:
      "Av. Simón López 275, Salon de Eventos 'La Riviera frente a la Corte Electoral, Cochabamba, Bolivia",
    mapLink: "https://maps.app.goo.gl/c9acAmABW2piLXSk6",
    images: [imagen4, imagen2, imagen3, imagen1],
  };

  const porQueElegirnos = [
    {
      title: "Área de Fuerza y Musculación",
      description:
        "Equipos de última generación para entrenamiento de pecho, espalda, piernas y brazos.",
    },
    {
      title: "Área de Cardio",
      description:
        "Cintas de correr y equipos cardiovasculares para mejorar tu resistencia y quemar calorías.",
    },
    {
      title: "Zona de Pesas y Entrenamiento Funcional",
      description:
        "Espacio completo con mancuernas, máquinas y áreas para rutinas de alto rendimiento.",
    },
    {
      title: "Zona de Mancuernas",
      description:
        "Espacio equipado con mancuernas y bancos para el entrenamiento de fuerza y tonificación muscular.",
    },
  ];

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

        {/* Info de ubicación compacta */}
        <div className="max-w-2xl mx-auto mb-10 bg-secondary/50 backdrop-blur-sm rounded-xl p-4 border border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-sm mb-1">{gymInfo.name}</h3>
                <p className="text-muted-foreground text-xs">
                  {gymInfo.address}
                </p>
              </div>
            </div>
            <a
              href={gymInfo.mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors duration-200 text-sm font-medium flex items-center gap-2 whitespace-nowrap"
            >
              <MapPin className="h-5 w-5 text-primary-foreground flex-shrink-0 -mt-0.5" />
              Ver en Maps
            </a>
          </div>
        </div>

        {/* Grid de características */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {porQueElegirnos.map((item, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-all duration-300"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={gymInfo.images[index]}
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
                <h3 className="font-semibold mb-1 text-xs sm:text-sm">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-xs">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}