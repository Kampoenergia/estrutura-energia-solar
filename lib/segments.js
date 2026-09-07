const SEGMENTS = {
  industria: { label: '🏭 Indústria / fábrica', selector: '["industrial"="yes"]', kwh: 28000, intensity: 5, propertyType: 'industrial' },
  galpao: { label: '🏢 Galpão / centro logístico', selector: '["building"="warehouse"]', kwh: 18000, intensity: 5, propertyType: 'comercial' },
  supermercado: { label: '🛒 Supermercado', selector: '["shop"="supermarket"]', kwh: 12000, intensity: 5, propertyType: 'comercial' },
  hotel: { label: '🏨 Hotel / pousada', selector: '["tourism"="hotel"]', kwh: 9000, intensity: 5, propertyType: 'comercial' },
  restaurante: { label: '🍽️ Restaurante', selector: '["amenity"="restaurant"]', kwh: 4500, intensity: 4, propertyType: 'comercial' },
  padaria: { label: '🥖 Padaria', selector: '["shop"="bakery"]', kwh: 4500, intensity: 4, propertyType: 'comercial' },
  academia: { label: '💪 Academia', selector: '["leisure"="fitness_centre"]', kwh: 4000, intensity: 4, propertyType: 'comercial' },
  posto: { label: '⛽ Posto de combustível', selector: '["amenity"="fuel"]', kwh: 5000, intensity: 4, propertyType: 'comercial' },
  escola: { label: '🏫 Escola / faculdade', selector: '["amenity"="school"]', kwh: 6000, intensity: 4, propertyType: 'comercial' },
  hospital: { label: '🏥 Hospital / clínica', selector: '["amenity"="hospital"]', kwh: 11000, intensity: 5, propertyType: 'comercial' },
  condominio: { label: '🏘️ Condomínio / síndico', selector: '["building"="apartments"]', kwh: 7000, intensity: 4, propertyType: 'residencial' },
  agro: { label: '🌾 Agro / propriedade rural', selector: '["landuse"="farmyard"]', kwh: 8000, intensity: 4, propertyType: 'rural' },
};


module.exports = SEGMENTS;
