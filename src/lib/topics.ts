export interface TopicOption {
  id: string;
  name: string;
  classLevel: number;
}

export const SUBJECTS = ["Science"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const TOPICS_BY_CLASS: Record<number, TopicOption[]> = {
  6: [
    {
      id: "c6_food_sources",
      name: "Food: Where Does It Come From?",
      classLevel: 6,
    },
    { id: "c6_components_food", name: "Components of Food", classLevel: 6 },
    { id: "c6_fibre_fabric", name: "Fibre to Fabric", classLevel: 6 },
    {
      id: "c6_sorting_materials",
      name: "Sorting Materials into Groups",
      classLevel: 6,
    },
    { id: "c6_separation", name: "Separation of Substances", classLevel: 6 },
    { id: "c6_changes", name: "Changes Around Us", classLevel: 6 },
    { id: "c6_plants", name: "Getting to Know Plants", classLevel: 6 },
    { id: "c6_body_movements", name: "Body Movements", classLevel: 6 },
    {
      id: "c6_living_organisms",
      name: "The Living Organisms and Their Surroundings",
      classLevel: 6,
    },
    {
      id: "c6_motion",
      name: "Motion and Measurement of Distances",
      classLevel: 6,
    },
    {
      id: "c6_light_shadow",
      name: "Light, Shadows and Reflections",
      classLevel: 6,
    },
    { id: "c6_electricity", name: "Electricity and Circuits", classLevel: 6 },
    { id: "c6_magnets", name: "Fun with Magnets", classLevel: 6 },
    { id: "c6_water", name: "Water", classLevel: 6 },
  ],
  7: [
    { id: "c7_nutrition_plants", name: "Nutrition in Plants", classLevel: 7 },
    { id: "c7_nutrition_animals", name: "Nutrition in Animals", classLevel: 7 },
    {
      id: "c7_fibre_fabric",
      name: "Fibre to Fabric: Wool and Silk",
      classLevel: 7,
    },
    { id: "c7_heat", name: "Heat", classLevel: 7 },
    { id: "c7_acids_bases", name: "Acids, Bases and Salts", classLevel: 7 },
    {
      id: "c7_physical_chemical",
      name: "Physical and Chemical Changes",
      classLevel: 7,
    },
    {
      id: "c7_weather_climate",
      name: "Weather, Climate and Adaptations",
      classLevel: 7,
    },
    {
      id: "c7_winds_storms",
      name: "Winds, Storms and Cyclones",
      classLevel: 7,
    },
    { id: "c7_soil", name: "Soil", classLevel: 7 },
    { id: "c7_respiration", name: "Respiration in Organisms", classLevel: 7 },
    {
      id: "c7_transportation",
      name: "Transportation in Plants and Animals",
      classLevel: 7,
    },
    {
      id: "c7_reproduction_plants",
      name: "Reproduction in Plants",
      classLevel: 7,
    },
    { id: "c7_motion_time", name: "Motion and Time", classLevel: 7 },
    {
      id: "c7_electric_current",
      name: "Electric Current and its Effects",
      classLevel: 7,
    },
    { id: "c7_light", name: "Light", classLevel: 7 },
    {
      id: "c7_water_resource",
      name: "Water: A Precious Resource",
      classLevel: 7,
    },
  ],
  8: [
    {
      id: "c8_crop_production",
      name: "Crop Production and Management",
      classLevel: 8,
    },
    {
      id: "c8_microorganisms",
      name: "Microorganisms: Friend and Foe",
      classLevel: 8,
    },
    {
      id: "c8_synthetic_fibres",
      name: "Synthetic Fibres and Plastics",
      classLevel: 8,
    },
    {
      id: "c8_metals_nonmetals",
      name: "Materials: Metals and Non-Metals",
      classLevel: 8,
    },
    { id: "c8_coal_petroleum", name: "Coal and Petroleum", classLevel: 8 },
    { id: "c8_combustion", name: "Combustion and Flame", classLevel: 8 },
    {
      id: "c8_conservation",
      name: "Conservation of Plants and Animals",
      classLevel: 8,
    },
    {
      id: "c8_cell_structure",
      name: "Cell Structure and Functions",
      classLevel: 8,
    },
    {
      id: "c8_reproduction_animals",
      name: "Reproduction in Animals",
      classLevel: 8,
    },
    {
      id: "c8_adolescence",
      name: "Reaching the Age of Adolescence",
      classLevel: 8,
    },
    { id: "c8_force_pressure", name: "Force and Pressure", classLevel: 8 },
    { id: "c8_friction", name: "Friction", classLevel: 8 },
    { id: "c8_sound", name: "Sound", classLevel: 8 },
    {
      id: "c8_chemical_effects",
      name: "Chemical Effects of Electric Current",
      classLevel: 8,
    },
    {
      id: "c8_natural_phenomena",
      name: "Some Natural Phenomena",
      classLevel: 8,
    },
    { id: "c8_light", name: "Light: Reflection and Refraction", classLevel: 8 },
  ],
  9: [
    { id: "c9_matter", name: "Matter in Our Surroundings", classLevel: 9 },
    { id: "c9_matter_pure", name: "Is Matter Around Us Pure", classLevel: 9 },
    { id: "c9_atoms_molecules", name: "Atoms and Molecules", classLevel: 9 },
    { id: "c9_structure_atom", name: "Structure of the Atom", classLevel: 9 },
    {
      id: "c9_fundamental_unit",
      name: "The Fundamental Unit of Life",
      classLevel: 9,
    },
    { id: "c9_tissues", name: "Tissues", classLevel: 9 },
    {
      id: "c9_diversity",
      name: "Diversity in Living Organisms",
      classLevel: 9,
    },
    { id: "c9_motion", name: "Motion", classLevel: 9 },
    { id: "c9_force_laws", name: "Force and Laws of Motion", classLevel: 9 },
    { id: "c9_gravitation", name: "Gravitation", classLevel: 9 },
    { id: "c9_work_energy", name: "Work and Energy", classLevel: 9 },
    { id: "c9_sound", name: "Sound", classLevel: 9 },
    { id: "c9_why_fall_ill", name: "Why Do We Fall Ill", classLevel: 9 },
    { id: "c9_natural_resources", name: "Natural Resources", classLevel: 9 },
    {
      id: "c9_food_resources",
      name: "Improvement in Food Resources",
      classLevel: 9,
    },
  ],
  10: [
    {
      id: "c10_chemical_reactions",
      name: "Chemical Reactions and Equations",
      classLevel: 10,
    },
    { id: "c10_acids_bases", name: "Acids, Bases and Salts", classLevel: 10 },
    {
      id: "c10_metals_nonmetals",
      name: "Metals and Non-Metals",
      classLevel: 10,
    },
    { id: "c10_carbon", name: "Carbon and its Compounds", classLevel: 10 },
    { id: "c10_life_processes", name: "Life Processes", classLevel: 10 },
    {
      id: "c10_control_coord",
      name: "Control and Coordination",
      classLevel: 10,
    },
    {
      id: "c10_reproduction",
      name: "How Do Organisms Reproduce",
      classLevel: 10,
    },
    { id: "c10_heredity", name: "Heredity and Evolution", classLevel: 10 },
    {
      id: "c10_light",
      name: "Light: Reflection and Refraction",
      classLevel: 10,
    },
    {
      id: "c10_human_eye",
      name: "The Human Eye and the Colourful World",
      classLevel: 10,
    },
    { id: "c10_electricity", name: "Electricity", classLevel: 10 },
    {
      id: "c10_magnetic_effects",
      name: "Magnetic Effects of Electric Current",
      classLevel: 10,
    },
    { id: "c10_energy_sources", name: "Sources of Energy", classLevel: 10 },
    { id: "c10_environment", name: "Our Environment", classLevel: 10 },
  ],
};

export const CLASS_LEVELS = [6, 7, 8, 9, 10] as const;
