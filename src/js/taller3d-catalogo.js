/* TechRevive · Taller 3D — Catálogo de piezas.
   Datos técnicos reales; precios de referencia en quetzales (piezas antiguas = precio de usado).
   Para agregar una pieza copia una línea parecida y cambia sus datos. Medidas en centímetros. */
window.TALLER3D_CATALOGO = (function () {
  "use strict";
  // Generaciones de procesador: nombre que verá el alumno y si Windows 11 las admite
  var GEN = {
    core2: ["Core 2 (2008)", false], snb: ["Intel 2.ª gen (2011)", false], ivb: ["Intel 3.ª gen (2012)", false],
    i6: ["Intel 6.ª gen (2015)", false], i7: ["Intel 7.ª gen (2017)", false], i8: ["Intel 8.ª gen (2017)", true], i9: ["Intel 9.ª gen (2018)", true],
    i10: ["Intel 10.ª gen (2020)", true], i11: ["Intel 11.ª gen (2021)", true], i12: ["Intel 12.ª gen (2021)", true], i13: ["Intel 13.ª gen (2022)", true],
    i14: ["Intel 14.ª gen (2023)", true], mtl: ["Intel Core Ultra serie 1 (2023)", true], arl: ["Intel Core Ultra 200S (2024)", true],
    fx: ["AMD FX (2012)", false], zen1: ["Ryzen 1000 / Athlon (2017)", false], zen2: ["Ryzen 3000 (2019)", true], zen3: ["Ryzen 5000 (2020)", true],
    zen4: ["Ryzen 7000/8000 (2022)", true], zen5: ["Ryzen 9000 (2024)", true],
  };

  // ── Gabinetes: H alto, D profundidad, W ancho · gpu = largo máx. de tarjeta · cooler = altura máx. de disipador
  var cases = [
    { id: "case-full", name: "Full tower E-ATX", sub: "Gabinete grande con vidrio templado", H: 55, D: 52, W: 24, boards: ["E-ATX", "ATX", "mATX", "ITX"], gpu: 42, cooler: 18.5, rads: [240, 280, 360, 420], psu: ["ATX", "SFX"], b35: 4, b25: 4, price: 1400, color: "#1f2937" },
    { id: "case-mid", name: "Mid tower ATX", sub: "El más común: cabe casi todo", H: 49, D: 45, W: 22, boards: ["ATX", "mATX", "ITX"], gpu: 36, cooler: 16.5, rads: [240, 280, 360], psu: ["ATX", "SFX"], b35: 2, b25: 2, price: 650, color: "#111827" },
    { id: "case-matx", name: "Micro-ATX compacto", sub: "Para oficina o gamer de presupuesto", H: 42, D: 40, W: 20.5, boards: ["mATX", "ITX"], gpu: 30, cooler: 15.5, rads: [240], psu: ["ATX", "SFX"], b35: 1, b25: 2, price: 450, color: "#1e293b" },
    { id: "case-itx", name: "Mini-ITX SFF (pequeño)", sub: "Solo fuente SFX y disipador bajo", H: 33, D: 35, W: 19, boards: ["ITX"], gpu: 28, cooler: 7, rads: [], psu: ["SFX"], b35: 0, b25: 2, price: 900, color: "#334155" },
    { id: "case-old", name: "Gabinete de oficina 2008", sub: "Antiguo, sin espacio para tarjetas largas", H: 42, D: 42, W: 18.5, boards: ["mATX"], gpu: 22, cooler: 13, rads: [], psu: ["ATX"], b35: 2, b25: 0, price: 100, color: "#9ca3af", beige: true, psuTop: true },
  ];

  // ── Placas madre · gens = generaciones que acepta · bios = las que requieren actualizar BIOS · m2 = ranuras [tipo, gen PCIe]
  var boards = [
    { id: "mb-g41", name: "Placa G41 (LGA775)", sub: "2008 · DDR2 · video integrado en el chipset", socket: "LGA775", ff: "mATX", mem: "DDR2", slots: 2, maxRam: 8, gens: ["core2"], bios: [], m2: [], sata: 4, igpu: true, pcie: 1, price: 150, pcb: "#2b3a1f", year: 2008 },
    { id: "mb-h61", name: "Placa H61 (LGA1155)", sub: "2011 · DDR3 · sin M.2", socket: "LGA1155", ff: "mATX", mem: "DDR3", slots: 2, maxRam: 16, gens: ["snb", "ivb"], bios: ["ivb"], m2: [], sata: 4, pcie: 1, price: 250, pcb: "#1f2a44", year: 2011 },
    { id: "mb-970", name: "Placa 970 (AM3+)", sub: "2012 · DDR3 · sin video integrado", socket: "AM3+", ff: "ATX", mem: "DDR3", slots: 4, maxRam: 32, gens: ["fx"], bios: [], m2: [], sata: 6, pcie: 2, price: 300, pcb: "#3a2a1a", year: 2012 },
    { id: "mb-b250", name: "Placa B250M (LGA1151 v1)", sub: "2017 · DDR4 · solo Intel 6.ª y 7.ª gen", socket: "LGA1151", ff: "mATX", mem: "DDR4", slots: 4, maxRam: 64, gens: ["i6", "i7"], bios: [], m2: [["nvme", 3]], sata: 6, pcie: 1, price: 400, pcb: "#1b2433", year: 2017 },
    { id: "mb-b360", name: "Placa B360 (LGA1151 v2)", sub: "2018 · DDR4 · solo Intel 8.ª y 9.ª gen", socket: "LGA1151", ff: "ATX", mem: "DDR4", slots: 4, maxRam: 64, gens: ["i8", "i9"], bios: [], m2: [["nvme", 3]], sata: 6, pcie: 2, price: 500, pcb: "#151b26", year: 2018 },
    { id: "mb-b560", name: "Placa B560M (LGA1200)", sub: "2021 · DDR4 · 10.ª y 11.ª gen", socket: "LGA1200", ff: "mATX", mem: "DDR4", slots: 4, maxRam: 128, gens: ["i10", "i11"], bios: [], m2: [["nvme", 4], ["nvme", 3]], sata: 6, pcie: 1, price: 750, pcb: "#11161f", year: 2021 },
    { id: "mb-b660", name: "Placa B660M DDR4 (LGA1700)", sub: "2022 · DDR4 · 13.ª/14.ª gen con BIOS nuevo", socket: "LGA1700", ff: "mATX", mem: "DDR4", slots: 4, maxRam: 128, gens: ["i12", "i13", "i14"], bios: ["i13", "i14"], m2: [["nvme", 4], ["nvme", 4]], sata: 4, pcie: 1, price: 900, pcb: "#10151d", year: 2022 },
    { id: "mb-b760", name: "Placa B760 DDR5 (LGA1700)", sub: "2023 · DDR5 · 12.ª a 14.ª gen", socket: "LGA1700", ff: "ATX", mem: "DDR5", slots: 4, maxRam: 192, gens: ["i12", "i13", "i14"], bios: [], m2: [["nvme", 4], ["nvme", 4], ["nvme", 4]], sata: 4, pcie: 2, price: 1300, pcb: "#0f141c", year: 2023 },
    { id: "mb-z790i", name: "Placa Z790-I (LGA1700, Mini-ITX)", sub: "2023 · DDR5 · pequeña, 2 ranuras de RAM", socket: "LGA1700", ff: "ITX", mem: "DDR5", slots: 2, maxRam: 96, gens: ["i12", "i13", "i14"], bios: [], m2: [["nvme", 4], ["nvme", 4]], sata: 2, pcie: 1, price: 2200, pcb: "#0d1117", year: 2023 },
    { id: "mb-z890", name: "Placa Z890 (LGA1851)", sub: "2024 · DDR5 · M.2 PCIe 5.0", socket: "LGA1851", ff: "ATX", mem: "DDR5", slots: 4, maxRam: 256, gens: ["arl"], bios: [], m2: [["nvme", 5], ["nvme", 4], ["nvme", 4]], sata: 4, pcie: 2, price: 2600, pcb: "#0b0f15", year: 2024 },
    { id: "mb-b450", name: "Placa B450M (AM4)", sub: "2018 · DDR4 · Ryzen 5000 con BIOS nuevo", socket: "AM4", ff: "mATX", mem: "DDR4", slots: 4, maxRam: 64, gens: ["zen1", "zen2", "zen3"], bios: ["zen3"], m2: [["nvme", 3]], sata: 4, pcie: 1, price: 550, pcb: "#151a24", year: 2018 },
    { id: "mb-b550", name: "Placa B550 (AM4)", sub: "2020 · DDR4 · NO acepta Ryzen 1000/2000", socket: "AM4", ff: "ATX", mem: "DDR4", slots: 4, maxRam: 128, gens: ["zen2", "zen3"], bios: [], m2: [["nvme", 4], ["nvme", 3]], sata: 6, pcie: 2, price: 900, pcb: "#12161e", year: 2020 },
    { id: "mb-a620", name: "Placa A620M (AM5)", sub: "2023 · DDR5 · económica", socket: "AM5", ff: "mATX", mem: "DDR5", slots: 2, maxRam: 96, gens: ["zen4", "zen5"], bios: ["zen5"], m2: [["nvme", 4]], sata: 4, pcie: 1, price: 900, pcb: "#11151c", year: 2023 },
    { id: "mb-b650", name: "Placa B650 (AM5)", sub: "2023 · DDR5 · la más equilibrada", socket: "AM5", ff: "ATX", mem: "DDR5", slots: 4, maxRam: 192, gens: ["zen4", "zen5"], bios: [], m2: [["nvme", 4], ["nvme", 4]], sata: 4, pcie: 2, price: 1450, pcb: "#0e131a", year: 2023 },
    { id: "mb-b650i", name: "Placa B650I (AM5, Mini-ITX)", sub: "2023 · DDR5 · pequeña", socket: "AM5", ff: "ITX", mem: "DDR5", slots: 2, maxRam: 96, gens: ["zen4", "zen5"], bios: [], m2: [["nvme", 4], ["nvme", 4]], sata: 2, pcie: 1, price: 2000, pcb: "#0d1117", year: 2023 },
    { id: "mb-x870e", name: "Placa X870E (AM5, E-ATX)", sub: "2024 · DDR5 · gama alta, PCIe 5.0", socket: "AM5", ff: "E-ATX", mem: "DDR5", slots: 4, maxRam: 256, gens: ["zen4", "zen5"], bios: [], m2: [["nvme", 5], ["nvme", 5], ["nvme", 4], ["nvme", 4]], sata: 4, pcie: 3, price: 4200, pcb: "#0a0d12", year: 2024 },
  ];

  // ── Procesadores · tdp = consumo típico · w = consumo máximo · st/mt = rendimiento relativo · ig = poder del video integrado (0 = no tiene)
  var cpus = [
    { id: "cpu-e8400", name: "Intel Core 2 Duo E8400", socket: "LGA775", gen: "core2", c: "2 núcleos / 2 hilos · 3.0 GHz", tdp: 65, w: 65, st: 15, mt: 6, ig: 0, price: 60 },
    { id: "cpu-2400", name: "Intel Core i5-2400", socket: "LGA1155", gen: "snb", c: "4 núcleos / 4 hilos · 3.1 GHz", tdp: 95, w: 95, st: 33, mt: 18, ig: 3, price: 150 },
    { id: "cpu-3770", name: "Intel Core i7-3770", socket: "LGA1155", gen: "ivb", c: "4 núcleos / 8 hilos · 3.4 GHz", tdp: 77, w: 77, st: 38, mt: 26, ig: 4, price: 300 },
    { id: "cpu-fx8350", name: "AMD FX-8350", socket: "AM3+", gen: "fx", c: "8 núcleos / 8 hilos · 4.0 GHz", tdp: 125, w: 125, st: 28, mt: 26, ig: 0, price: 250 },
    { id: "cpu-7400", name: "Intel Core i5-7400", socket: "LGA1151", gen: "i7", c: "4 núcleos / 4 hilos · 3.0 GHz", tdp: 65, w: 65, st: 45, mt: 26, ig: 8, price: 350 },
    { id: "cpu-8400", name: "Intel Core i5-8400", socket: "LGA1151", gen: "i8", c: "6 núcleos / 6 hilos · 2.8 GHz", tdp: 65, w: 75, st: 52, mt: 38, ig: 8, price: 500 },
    { id: "cpu-9100f", name: "Intel Core i3-9100F", socket: "LGA1151", gen: "i9", c: "4 núcleos / 4 hilos · sin video integrado", tdp: 65, w: 65, st: 54, mt: 28, ig: 0, price: 400 },
    { id: "cpu-9700k", name: "Intel Core i7-9700K", socket: "LGA1151", gen: "i9", c: "8 núcleos / 8 hilos · 3.6 GHz", tdp: 95, w: 125, st: 62, mt: 55, ig: 8, price: 1100 },
    { id: "cpu-10400", name: "Intel Core i5-10400", socket: "LGA1200", gen: "i10", c: "6 núcleos / 12 hilos · 2.9 GHz", tdp: 65, w: 90, st: 58, mt: 50, ig: 8, price: 700 },
    { id: "cpu-11400f", name: "Intel Core i5-11400F", socket: "LGA1200", gen: "i11", c: "6 núcleos / 12 hilos · sin video integrado", tdp: 65, w: 110, st: 68, mt: 58, ig: 0, price: 850 },
    { id: "cpu-12100", name: "Intel Core i3-12100", socket: "LGA1700", gen: "i12", c: "4 núcleos / 8 hilos · 3.3 GHz", tdp: 60, w: 89, st: 78, mt: 45, ig: 10, price: 900 },
    { id: "cpu-12400f", name: "Intel Core i5-12400F", socket: "LGA1700", gen: "i12", c: "6 núcleos / 12 hilos · sin video integrado", tdp: 65, w: 117, st: 80, mt: 66, ig: 0, price: 1050 },
    { id: "cpu-13400", name: "Intel Core i5-13400", socket: "LGA1700", gen: "i13", c: "10 núcleos / 16 hilos · 2.5 GHz", tdp: 65, w: 148, st: 84, mt: 82, ig: 10, price: 1700 },
    { id: "cpu-13700k", name: "Intel Core i7-13700K", socket: "LGA1700", gen: "i13", c: "16 núcleos / 24 hilos · 3.4 GHz", tdp: 125, w: 253, st: 96, mt: 135, ig: 10, price: 3200 },
    { id: "cpu-14900k", name: "Intel Core i9-14900K", socket: "LGA1700", gen: "i14", c: "24 núcleos / 32 hilos · 3.2 GHz", tdp: 125, w: 253, st: 100, mt: 165, ig: 10, price: 4600 },
    { id: "cpu-245k", name: "Intel Core Ultra 5 245K", socket: "LGA1851", gen: "arl", c: "14 núcleos / 14 hilos · 4.2 GHz", tdp: 125, w: 159, st: 95, mt: 120, ig: 14, price: 2600 },
    { id: "cpu-285k", name: "Intel Core Ultra 9 285K", socket: "LGA1851", gen: "arl", c: "24 núcleos / 24 hilos · 3.7 GHz", tdp: 125, w: 250, st: 102, mt: 185, ig: 14, price: 5000 },
    { id: "cpu-3000g", name: "AMD Athlon 3000G", socket: "AM4", gen: "zen1", c: "2 núcleos / 4 hilos · video Vega 3", tdp: 35, w: 35, st: 40, mt: 15, ig: 6, price: 400 },
    { id: "cpu-1600", name: "AMD Ryzen 5 1600", socket: "AM4", gen: "zen1", c: "6 núcleos / 12 hilos · sin video integrado", tdp: 65, w: 65, st: 44, mt: 40, ig: 0, price: 350 },
    { id: "cpu-3600", name: "AMD Ryzen 5 3600", socket: "AM4", gen: "zen2", c: "6 núcleos / 12 hilos · sin video integrado", tdp: 65, w: 88, st: 60, mt: 55, ig: 0, price: 600 },
    { id: "cpu-5600g", name: "AMD Ryzen 5 5600G", socket: "AM4", gen: "zen3", c: "6 núcleos / 12 hilos · video Vega 7", tdp: 65, w: 88, st: 72, mt: 62, ig: 18, price: 1000 },
    { id: "cpu-5800x3d", name: "AMD Ryzen 7 5800X3D", socket: "AM4", gen: "zen3", c: "8 núcleos / 16 hilos · ideal para juegos", tdp: 105, w: 142, st: 90, mt: 80, ig: 0, price: 2300 },
    { id: "cpu-7600", name: "AMD Ryzen 5 7600", socket: "AM5", gen: "zen4", c: "6 núcleos / 12 hilos · 3.8 GHz", tdp: 65, w: 88, st: 90, mt: 82, ig: 6, price: 1550 },
    { id: "cpu-8600g", name: "AMD Ryzen 5 8600G", socket: "AM5", gen: "zen4", c: "6 núcleos / 12 hilos · video Radeon 760M", tdp: 65, w: 88, st: 86, mt: 78, ig: 30, price: 1700 },
    { id: "cpu-7800x3d", name: "AMD Ryzen 7 7800X3D", socket: "AM5", gen: "zen4", c: "8 núcleos / 16 hilos · el rey de los juegos", tdp: 120, w: 162, st: 106, mt: 105, ig: 6, price: 3300 },
    { id: "cpu-9950x", name: "AMD Ryzen 9 9950X", socket: "AM5", gen: "zen5", c: "16 núcleos / 32 hilos · 4.3 GHz", tdp: 170, w: 230, st: 104, mt: 200, ig: 6, price: 5200 },
  ];

  // ── Disipadores · s = sockets · tdp = calor que puede disipar · h = altura (cm) · rad = radiador (líquida)
  var MOD = ["LGA1151", "LGA1155", "LGA1200", "LGA1700", "LGA1851", "AM4", "AM5"];
  var coolers = [
    { id: "cl-775", name: "Disipador original Intel (LGA775)", ct: "stock", s: ["LGA775"], tdp: 65, h: 5, price: 40 },
    { id: "cl-115x", name: "Disipador original Intel (LGA1151/1155/1200)", ct: "stock", s: ["LGA1151", "LGA1155", "LGA1200"], tdp: 65, h: 5, price: 60 },
    { id: "cl-laminar", name: "Disipador original Intel Laminar (LGA1700/1851)", ct: "stock", s: ["LGA1700", "LGA1851"], tdp: 65, h: 5, price: 90 },
    { id: "cl-am3", name: "Disipador original AMD (AM3+/AM4)", ct: "stock", s: ["AM3+", "AM4"], tdp: 125, h: 7, price: 80 },
    { id: "cl-wraith", name: "AMD Wraith Stealth (AM4/AM5)", ct: "stock", s: ["AM4", "AM5"], tdp: 65, h: 5.5, price: 80 },
    { id: "cl-lp", name: "Disipador de perfil bajo 47 mm", ct: "lowprofile", s: MOD, tdp: 95, h: 4.7, price: 350 },
    { id: "cl-t120", name: "Disipador de torre 120 mm", ct: "tower", s: MOD.concat(["AM3+"]), tdp: 180, h: 15.5, price: 300 },
    { id: "cl-t140", name: "Disipador de torre doble 140 mm", ct: "tower2", s: MOD, tdp: 250, h: 16.5, price: 750 },
    { id: "cl-aio240", name: "Enfriamiento líquido AIO 240 mm", ct: "aio", rad: 240, s: MOD, tdp: 250, h: 4, price: 900 },
    { id: "cl-aio360", name: "Enfriamiento líquido AIO 360 mm", ct: "aio", rad: 360, s: MOD, tdp: 320, h: 4, price: 1300 },
  ];

  // ── Memoria RAM · form DIMM (escritorio) o SODIMM (laptop)
  var rams = [
    { id: "ram-ddr2-2", name: "DDR2 2 GB 800 MHz", type: "DDR2", form: "DIMM", gb: 2, mhz: 800, price: 25, color: "#166534" },
    { id: "ram-ddr3-4", name: "DDR3 4 GB 1600 MHz", type: "DDR3", form: "DIMM", gb: 4, mhz: 1600, price: 50, color: "#166534" },
    { id: "ram-ddr3-8", name: "DDR3 8 GB 1600 MHz", type: "DDR3", form: "DIMM", gb: 8, mhz: 1600, price: 90, color: "#1e3a8a" },
    { id: "ram-ddr4-8", name: "DDR4 8 GB 3200 MHz", type: "DDR4", form: "DIMM", gb: 8, mhz: 3200, price: 150, color: "#111827" },
    { id: "ram-ddr4-16", name: "DDR4 16 GB 3200 MHz", type: "DDR4", form: "DIMM", gb: 16, mhz: 3200, price: 280, color: "#991b1b" },
    { id: "ram-ddr5-16", name: "DDR5 16 GB 6000 MHz", type: "DDR5", form: "DIMM", gb: 16, mhz: 6000, price: 420, color: "#0f172a", rgb: true },
    { id: "ram-ddr5-32", name: "DDR5 32 GB 6000 MHz", type: "DDR5", form: "DIMM", gb: 32, mhz: 6000, price: 800, color: "#e5e7eb", rgb: true },
    { id: "so-ddr3l-4", name: "SODIMM DDR3L 4 GB 1600", type: "DDR3L", form: "SODIMM", gb: 4, mhz: 1600, price: 60, color: "#166534" },
    { id: "so-ddr3l-8", name: "SODIMM DDR3L 8 GB 1600", type: "DDR3L", form: "SODIMM", gb: 8, mhz: 1600, price: 110, color: "#166534" },
    { id: "so-ddr4-8", name: "SODIMM DDR4 8 GB 3200", type: "DDR4", form: "SODIMM", gb: 8, mhz: 3200, price: 160, color: "#14532d" },
    { id: "so-ddr4-16", name: "SODIMM DDR4 16 GB 3200", type: "DDR4", form: "SODIMM", gb: 16, mhz: 3200, price: 300, color: "#14532d" },
    { id: "so-ddr5-16", name: "SODIMM DDR5 16 GB 5600", type: "DDR5", form: "SODIMM", gb: 16, mhz: 5600, price: 420, color: "#0f3d2e" },
    { id: "so-ddr5-32", name: "SODIMM DDR5 32 GB 5600", type: "DDR5", form: "SODIMM", gb: 32, mhz: 5600, price: 800, color: "#0f3d2e" },
  ];

  // ── Tarjetas de video · L = largo · sl = ranuras que ocupa · w = consumo · p8/p16 = conectores PCIe 8 pines / 16 pines (12VHPWR) · g = rendimiento en juegos
  var gpus = [
    { id: "gpu-gt710", name: "NVIDIA GeForce GT 710 2 GB", L: 17, sl: 1, w: 19, p8: 0, p16: 0, g: 3, price: 250, year: 2014, color: "#1f2937" },
    { id: "gpu-750ti", name: "NVIDIA GeForce GTX 750 Ti 2 GB", L: 19, sl: 2, w: 60, p8: 0, p16: 0, g: 14, price: 300, year: 2014, color: "#111827" },
    { id: "gpu-1650", name: "NVIDIA GeForce GTX 1650 4 GB", L: 17, sl: 2, w: 75, p8: 0, p16: 0, g: 30, price: 1050, year: 2019, color: "#1f2937" },
    { id: "gpu-1660s", name: "NVIDIA GeForce GTX 1660 Super 6 GB", L: 23, sl: 2, w: 125, p8: 1, p16: 0, g: 45, price: 1400, year: 2019, color: "#111827" },
    { id: "gpu-3060", name: "NVIDIA GeForce RTX 3060 12 GB", L: 24, sl: 2, w: 170, p8: 1, p16: 0, g: 60, price: 2300, year: 2021, color: "#18181b" },
    { id: "gpu-6600", name: "AMD Radeon RX 6600 8 GB", L: 19, sl: 2, w: 132, p8: 1, p16: 0, g: 58, price: 1900, year: 2021, color: "#7f1d1d" },
    { id: "gpu-4060", name: "NVIDIA GeForce RTX 4060 8 GB", L: 20, sl: 2, w: 115, p8: 1, p16: 0, g: 70, price: 2500, year: 2023, color: "#18181b" },
    { id: "gpu-4070s", name: "NVIDIA GeForce RTX 4070 Super 12 GB", L: 27, sl: 2.5, w: 220, p8: 0, p16: 1, g: 115, price: 5000, year: 2024, color: "#0f0f10" },
    { id: "gpu-7800xt", name: "AMD Radeon RX 7800 XT 16 GB", L: 27, sl: 2.5, w: 263, p8: 2, p16: 0, g: 108, price: 4600, year: 2023, color: "#3f0d12" },
    { id: "gpu-5070", name: "NVIDIA GeForce RTX 5070 12 GB", L: 24, sl: 2, w: 250, p8: 0, p16: 1, g: 125, price: 5300, year: 2025, color: "#0f0f10" },
    { id: "gpu-4090", name: "NVIDIA GeForce RTX 4090 24 GB", L: 34, sl: 3.5, w: 450, p8: 0, p16: 1, g: 200, price: 16000, year: 2022, color: "#0a0a0a" },
  ];

  // ── Almacenamiento · bus: sata / nvme / m2sata · size: 3.5, 2.5 o m2 · gen = PCIe (NVMe)
  var drives = [
    { id: "hdd35-1", name: "Disco duro 3.5\" 1 TB 7200 rpm", bus: "sata", size: "3.5", tb: 1, speed: 150, price: 350, desk: true },
    { id: "hdd35-4", name: "Disco duro 3.5\" 4 TB 5400 rpm", bus: "sata", size: "3.5", tb: 4, speed: 180, price: 850, desk: true },
    { id: "hdd25-1", name: "Disco duro 2.5\" 1 TB 5400 rpm", bus: "sata", size: "2.5", tb: 1, speed: 100, price: 400, desk: true, lap: true },
    { id: "ssd25-480", name: "SSD SATA 2.5\" 480 GB", bus: "sata", size: "2.5", tb: 0.48, speed: 550, price: 300, desk: true, lap: true },
    { id: "ssd25-1", name: "SSD SATA 2.5\" 1 TB", bus: "sata", size: "2.5", tb: 1, speed: 560, price: 550, desk: true, lap: true },
    { id: "m2sata-256", name: "SSD M.2 SATA 256 GB", bus: "m2sata", size: "m2", tb: 0.256, speed: 550, price: 250, desk: true, lap: true },
    { id: "nvme3-500", name: "SSD NVMe PCIe 3.0 500 GB", bus: "nvme", size: "m2", gen: 3, tb: 0.5, speed: 3500, price: 350, desk: true, lap: true },
    { id: "nvme4-1", name: "SSD NVMe PCIe 4.0 1 TB", bus: "nvme", size: "m2", gen: 4, tb: 1, speed: 7000, price: 700, desk: true, lap: true },
    { id: "nvme5-2", name: "SSD NVMe PCIe 5.0 2 TB (con disipador)", bus: "nvme", size: "m2", gen: 5, tb: 2, speed: 12000, price: 2200, desk: true, hs: true },
  ];

  // ── Fuentes de poder · w = potencia real · p8 = conectores PCIe 8 pines · p16 = 16 pines nativo · ff = ATX o SFX
  var psus = [
    { id: "psu-gen500", name: "Fuente genérica «500 W»", sub: "Sin certificación · entrega ~300 W reales", w: 300, label: 500, p8: 1, p16: 0, sata: 2, ff: "ATX", generic: true, price: 150 },
    { id: "psu-450b", name: "Fuente 450 W 80 PLUS Bronze", sub: "Para equipos de oficina", w: 450, p8: 1, p16: 0, sata: 4, ff: "ATX", price: 400 },
    { id: "psu-650b", name: "Fuente 650 W 80 PLUS Bronze", sub: "La más recomendada para gamer medio", w: 650, p8: 2, p16: 0, sata: 6, ff: "ATX", price: 650 },
    { id: "psu-850g", name: "Fuente 850 W 80 PLUS Gold ATX 3.0", sub: "Con conector de 16 pines nativo", w: 850, p8: 3, p16: 1, sata: 8, ff: "ATX", price: 1150 },
    { id: "psu-1000p", name: "Fuente 1000 W 80 PLUS Platinum ATX 3.1", sub: "Para equipos de gama alta", w: 1000, p8: 4, p16: 1, sata: 10, ff: "ATX", price: 1900 },
    { id: "psu-sfx600", name: "Fuente SFX 600 W 80 PLUS Gold", sub: "Pequeña, para gabinetes Mini-ITX", w: 600, p8: 2, p16: 0, sata: 4, ff: "SFX", price: 1100 },
  ];

  // ── Laptops (vienen con su configuración de fábrica) · ram = ranuras SODIMM (0 = soldada) · m2 = ranuras · b25 = bahía 2.5"
  var laptops = [
    { id: "lap-2012", name: "Laptop de oficina 2012 (15.6\")", sub: "Core i5-3210M · DDR3L · disco duro", cpu: { name: "Intel Core i5-3210M", gen: "ivb", st: 30, mt: 16, ig: 3 }, ram: 2, mem: "DDR3L", maxRam: 16, solder: 0, m2: [], b25: 1, stock: { ram: ["so-ddr3l-4", null], b25: ["hdd25-1"], batt: "bat-48", fan: ["fan-60"], screen: ["scr-tn-e30"], wifi: "wifi-7260" }, w: 37, d: 25, color: "#374151", fans: 1, odd: true, price: 900, wifi: "mpcie", fanSize: 60, ac: { t: "barrel", min: 45 }, scr: { size: "15.6\"", conn: "eDP 30 pines" } },
    { id: "lap-2016", name: "Laptop básica 2016 (14\")", sub: "Celeron N3060 · 2 GB · muy básica", cpu: { name: "Intel Celeron N3060 (soldado)", gen: "i6", st: 14, mt: 6, ig: 2 }, ram: 1, mem: "DDR3L", maxRam: 8, solder: 0, m2: [], b25: 1, stock: { ram: ["so-ddr3l-4"], b25: ["hdd25-1"], batt: "bat-32", fan: ["fan-50"], screen: ["scr-tn14"], wifi: "wifi-3168" }, w: 33, d: 23, color: "#0e7490", fans: 1, price: 700, wifi: "a2230", fanSize: 50, ac: { t: "barrel", min: 45 }, scr: { size: "14\"", conn: "eDP 30 pines" } },
    { id: "lap-2019", name: "Laptop de oficina 2019 (15.6\")", sub: "Core i5-8265U · DDR4 · M.2 + bahía 2.5\"", cpu: { name: "Intel Core i5-8265U (soldado)", gen: "i8", st: 50, mt: 30, ig: 7 }, ram: 2, mem: "DDR4", maxRam: 32, solder: 0, m2: [["nvme", 3, true]], b25: 1, stock: { ram: ["so-ddr4-8", null], b25: ["hdd25-1"], m2: [null], wifi: "wifi-3168", batt: "bat-48", fan: ["fan-60"], screen: ["scr-tn-e40"] }, w: 36, d: 24, color: "#1f2937", fans: 1, price: 2500, wifi: "a2230", fanSize: 60, ac: { t: "barrel", min: 65 }, scr: { size: "15.6\"", conn: "eDP 40 pines" } },
    { id: "lap-ultra", name: "Ultrabook 14\" 2024", sub: "Core Ultra 7 155H · RAM soldada · 1 M.2", cpu: { name: "Intel Core Ultra 7 155H (soldado)", gen: "mtl", st: 88, mt: 95, ig: 26 }, ram: 0, mem: "LPDDR5X", maxRam: 16, solder: 16, m2: [["nvme", 4]], b25: 0, stock: { m2: ["nvme4-1"], wifi: "wifi-ax210", batt: "bat-56", fan: ["fan-50"], screen: ["scr-ips14"] }, w: 31, d: 22, color: "#94a3b8", fans: 1, price: 8000, wifi: "a2230", fanSize: 50, ac: { t: "usbc", min: 65 }, scr: { size: "14\"", conn: "eDP 40 pines" } },
    { id: "lap-gamer", name: "Laptop gamer 15.6\" 2023", sub: "Ryzen 7 7735HS + RTX 4060 · DDR5 · 2 M.2", cpu: { name: "AMD Ryzen 7 7735HS (soldado)", gen: "zen3", st: 80, mt: 85, ig: 12 }, gpu: { name: "RTX 4060 Laptop (soldada)", g: 62 }, ram: 2, mem: "DDR5", maxRam: 64, solder: 0, m2: [["nvme", 4], ["nvme", 4]], b25: 0, stock: { ram: ["so-ddr5-16", null], m2: ["nvme4-1", null], wifi: "wifi-ax200", batt: "bat-90", fan: ["fan-75", "fan-75"], screen: ["scr-ips144"] }, w: 36, d: 26, color: "#0f172a", fans: 2, price: 9500, wifi: "a2230", fanSize: 75, ac: { t: "barrel", min: 180 }, scr: { size: "15.6\"", conn: "eDP 40 pines" } },
  ];

  // ── Tarjetas WiFi para laptop · key: "mpcie" (mini PCIe) o "a2230" (M.2 2230 A/E-key)
  var lwifi = [
    { id: "wifi-3168", name: "Tarjeta WiFi 802.11n/AC 1x1", key: "a2230", std: "WiFi 4/5 · 433 Mbps", price: 120, year: 2016 },
    { id: "wifi-7260", name: "Tarjeta WiFi Intel 7260HMW (mini PCIe)", key: "mpcie", std: "WiFi 5 · 867 Mbps", price: 130, year: 2014 },
    { id: "wifi-ax200", name: "Tarjeta WiFi Intel AX200", key: "a2230", std: "WiFi 6 · 2.4 Gbps", price: 280, year: 2019 },
    { id: "wifi-ax210", name: "Tarjeta WiFi Intel AX210", key: "a2230", std: "WiFi 6E · 3.0 Gbps", price: 350, year: 2021 },
  ];
  // ── Cargadores de laptop · t: "barrel" (punta redonda) o "usbc" (USB-C Power Delivery) · W = potencia
  var chargers = [
    { id: "ch-45", name: "Cargador 45 W (punta 4.5 mm)", t: "barrel", W: 45, price: 250 },
    { id: "ch-65", name: "Cargador 65 W (punta universal)", t: "barrel", W: 65, price: 300 },
    { id: "ch-65c", name: "Cargador 65 W USB-C PD", t: "usbc", W: 65, price: 380 },
    { id: "ch-100c", name: "Cargador 100 W USB-C PD", t: "usbc", W: 100, price: 550 },
    { id: "ch-180", name: "Cargador 180 W (gamer)", t: "barrel", W: 180, price: 700 },
    { id: "ch-240", name: "Cargador 240 W (gamer)", t: "barrel", W: 240, price: 900 },
  ];
  // ── Baterías de laptop · fit = laptops donde calzan físicamente
  var bats = [
    { id: "bat-32", name: "Batería de laptop 32 Wh", wh: 32, fit: ["lap-2016"], price: 450 },
    { id: "bat-48", name: "Batería de laptop 48 Wh", wh: 48, fit: ["lap-2012", "lap-2019"], price: 600 },
    { id: "bat-56", name: "Batería ultrabook 56 Wh", wh: 56, fit: ["lap-ultra"], price: 800 },
    { id: "bat-90", name: "Batería gamer 90 Wh", wh: 90, fit: ["lap-gamer"], price: 1100 },
  ];
  // ── Ventiladores de laptop · mm = tamaño
  var lfans = [
    { id: "fan-50", name: "Ventilador de laptop 50 mm", mm: 50, price: 200 },
    { id: "fan-60", name: "Ventilador de laptop 60 mm", mm: 60, price: 220 },
    { id: "fan-75", name: "Ventilador de laptop 75 mm (gamer)", mm: 75, price: 320 },
  ];
  // ── Pantallas de laptop · conn = conector eDP
  var screens = [
    { id: "scr-tn-e30", name: "Pantalla 15.6\" TN 60 Hz (eDP 30 pines)", size: "15.6\"", conn: "eDP 30 pines", acabo: "TN: colores lavados", hz: 60, price: 350 },
    { id: "scr-tn-e40", name: "Pantalla 15.6\" TN 60 Hz (eDP 40 pines)", size: "15.6\"", conn: "eDP 40 pines", acabo: "TN: colores lavados", hz: 60, price: 400 },
    { id: "scr-tn14", name: "Pantalla 14\" TN 60 Hz (eDP 30 pines)", size: "14\"", conn: "eDP 30 pines", acabo: "TN", hz: 60, price: 300 },
    { id: "scr-ips14", name: "Pantalla 14\" IPS FHD (eDP 40 pines)", size: "14\"", conn: "eDP 40 pines", acabo: "IPS: buenos ángulos", hz: 60, price: 650 },
    { id: "scr-ips60", name: "Pantalla 15.6\" IPS FHD 60 Hz (eDP 40 pines)", size: "15.6\"", conn: "eDP 40 pines", acabo: "IPS", hz: 60, price: 700 },
    { id: "scr-ips144", name: "Pantalla 15.6\" IPS FHD 144 Hz (eDP 40 pines)", size: "15.6\"", conn: "eDP 40 pines", acabo: "IPS · gamer", hz: 144, price: 1100 },
  ];
  return { GEN: GEN, cases: cases, boards: boards, cpus: cpus, coolers: coolers, rams: rams, gpus: gpus, drives: drives, psus: psus, laptops: laptops, lwifi: lwifi, chargers: chargers, bats: bats, lfans: lfans, screens: screens };
})();
