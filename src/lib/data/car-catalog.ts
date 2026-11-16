/**
 * Справочник «марка → модели → ценовой класс» для калькулятора и форм сайта.
 *
 * Посетитель выбирает марку и модель — сайт сам подставляет ценовой класс
 * студии (1–5, те же классы, что в таблице `carClasses` в БД и в матрицах цен):
 *   1 — бюджетные B/C-сегмент и компакты (Rio, Solaris, Lada, Polo, Creta…)
 *   2 — D-сегмент и средние кроссоверы массовых марок (Camry, Sportage, Tiguan, Haval F7…)
 *   3 — премиум компакт/бизнес и компактные премиум-кроссоверы (BMW 3, C-класс, Q5, NX, Model Y…)
 *   4 — большие премиум седаны и кроссоверы (BMW 5/X5, E-класс/GLE, Q7, LX, Cayenne…)
 *   5 — люкс и суперкары (S-класс, BMW 7/X7, Bentley, Rolls-Royce, Range Rover, 911…)
 *
 * Логика присвоения класса: сегмент × премиальность марки × габарит кузова.
 *
 * Как пополнять: добавьте объект в `CAR_CATALOG` (марки — по алфавиту латиницей,
 * модели внутри марки — по алфавиту), имя модели без марки («Rio», не «Kia Rio»),
 * без поколений — только модельные линейки. Кириллические варианты написания марок
 * и популярных моделей для поиска — в `BRAND_ALIASES` / `MODEL_ALIASES` ниже.
 *
 * Справочник не претендует на полноту: в UI обязательно должен оставаться ручной
 * фолбэк «выбрать класс самостоятельно» для машин, которых здесь нет.
 *
 * Зависимостей нет — только данные и две функции: `findCarClass` и `searchCars`.
 */

export type CarClassId = 1 | 2 | 3 | 4 | 5;

export interface CarModel {
  name: string;
  cls: CarClassId;
}

export interface CarBrand {
  name: string;
  models: CarModel[];
}

export interface CarSearchResult {
  brand: string;
  model: string;
  cls: CarClassId;
}

export const CAR_CATALOG: readonly CarBrand[] = [
  {
    name: 'Aito',
    models: [
      { name: 'M5', cls: 3 },
      { name: 'M7', cls: 3 },
      { name: 'M8', cls: 4 },
      { name: 'M9', cls: 4 },
    ],
  },
  {
    name: 'Aston Martin',
    models: [
      { name: 'DB11', cls: 5 },
      { name: 'DB12', cls: 5 },
      { name: 'DBS', cls: 5 },
      { name: 'DBX', cls: 5 },
      { name: 'Vantage', cls: 5 },
    ],
  },
  {
    name: 'Audi',
    models: [
      { name: 'A1', cls: 3 },
      { name: 'A3', cls: 3 },
      { name: 'A4', cls: 3 },
      { name: 'A5', cls: 3 },
      { name: 'A6', cls: 4 },
      { name: 'A7', cls: 4 },
      { name: 'A8', cls: 4 },
      { name: 'e-tron', cls: 4 },
      { name: 'e-tron GT', cls: 4 },
      { name: 'Q2', cls: 3 },
      { name: 'Q3', cls: 3 },
      { name: 'Q4 e-tron', cls: 3 },
      { name: 'Q5', cls: 3 },
      { name: 'Q6 e-tron', cls: 4 },
      { name: 'Q7', cls: 4 },
      { name: 'Q8', cls: 4 },
      { name: 'R8', cls: 5 },
      { name: 'RS 6', cls: 4 },
      { name: 'RS Q8', cls: 4 },
      { name: 'TT', cls: 3 },
    ],
  },
  {
    name: 'Aurus',
    models: [
      { name: 'Arsenal', cls: 4 },
      { name: 'Komendant', cls: 4 },
      { name: 'Senat', cls: 4 },
    ],
  },
  {
    name: 'BAIC',
    models: [
      { name: 'BJ40', cls: 2 },
      { name: 'BJ60', cls: 3 },
      { name: 'BJ80', cls: 3 },
      { name: 'U5 Plus', cls: 1 },
      { name: 'X7', cls: 2 },
      { name: 'X35', cls: 1 },
      { name: 'X55', cls: 2 },
    ],
  },
  {
    name: 'Bentley',
    models: [
      { name: 'Bentayga', cls: 5 },
      { name: 'Continental GT', cls: 5 },
      { name: 'Flying Spur', cls: 5 },
      { name: 'Mulsanne', cls: 5 },
    ],
  },
  {
    name: 'BMW',
    models: [
      { name: '1 серия', cls: 3 },
      { name: '2 серия', cls: 3 },
      { name: '3 серия', cls: 3 },
      { name: '4 серия', cls: 3 },
      { name: '5 серия', cls: 4 },
      { name: '7 серия', cls: 5 },
      { name: '8 серия', cls: 4 },
      { name: 'i4', cls: 3 },
      { name: 'i5', cls: 4 },
      { name: 'i7', cls: 5 },
      { name: 'iX', cls: 4 },
      { name: 'iX1', cls: 3 },
      { name: 'iX3', cls: 3 },
      { name: 'M2', cls: 3 },
      { name: 'M3', cls: 3 },
      { name: 'M4', cls: 3 },
      { name: 'M5', cls: 4 },
      { name: 'M8', cls: 4 },
      { name: 'X1', cls: 3 },
      { name: 'X2', cls: 3 },
      { name: 'X3', cls: 3 },
      { name: 'X4', cls: 4 },
      { name: 'X5', cls: 4 },
      { name: 'X6', cls: 4 },
      { name: 'X7', cls: 5 },
    ],
  },
  {
    name: 'BYD',
    models: [
      { name: 'Atto 3', cls: 2 },
      { name: 'Dolphin', cls: 1 },
      { name: 'Han', cls: 3 },
      { name: 'Leopard 5', cls: 3 },
      { name: 'Seal', cls: 2 },
      { name: 'Sealion 7', cls: 2 },
      { name: 'Song Plus', cls: 2 },
      { name: 'Tang', cls: 3 },
    ],
  },
  {
    name: 'Cadillac',
    models: [
      { name: 'ATS', cls: 3 },
      { name: 'CT4', cls: 3 },
      { name: 'CT5', cls: 3 },
      { name: 'CT6', cls: 4 },
      { name: 'CTS', cls: 3 },
      { name: 'Escalade', cls: 4 },
      { name: 'Lyriq', cls: 4 },
      { name: 'SRX', cls: 3 },
      { name: 'XT4', cls: 3 },
      { name: 'XT5', cls: 3 },
      { name: 'XT6', cls: 4 },
    ],
  },
  {
    name: 'Changan',
    models: [
      { name: 'Alsvin', cls: 1 },
      { name: 'CS35 Plus', cls: 1 },
      { name: 'CS55 Plus', cls: 2 },
      { name: 'CS75 Plus', cls: 2 },
      { name: 'CS85', cls: 2 },
      { name: 'CS95', cls: 2 },
      { name: 'Eado Plus', cls: 1 },
      { name: 'Hunter', cls: 2 },
      { name: 'Lamore', cls: 2 },
      { name: 'UNI-K', cls: 2 },
      { name: 'UNI-S', cls: 2 },
      { name: 'UNI-T', cls: 2 },
      { name: 'UNI-V', cls: 2 },
    ],
  },
  {
    name: 'Chery',
    models: [
      { name: 'Amulet', cls: 1 },
      { name: 'Arrizo 8', cls: 2 },
      { name: 'Bonus', cls: 1 },
      { name: 'Fora', cls: 1 },
      { name: 'Kimo', cls: 1 },
      { name: 'Tiggo', cls: 1 },
      { name: 'Tiggo 2 Pro', cls: 1 },
      { name: 'Tiggo 4', cls: 1 },
      { name: 'Tiggo 4 Pro', cls: 1 },
      { name: 'Tiggo 7 Pro', cls: 2 },
      { name: 'Tiggo 7 Pro Max', cls: 2 },
      { name: 'Tiggo 8', cls: 2 },
      { name: 'Tiggo 8 Pro', cls: 2 },
      { name: 'Tiggo 8 Pro Max', cls: 2 },
      { name: 'Tiggo 9', cls: 2 },
      { name: 'Very', cls: 1 },
    ],
  },
  {
    name: 'Chevrolet',
    models: [
      { name: 'Aveo', cls: 1 },
      { name: 'Camaro', cls: 3 },
      { name: 'Captiva', cls: 2 },
      { name: 'Cobalt', cls: 1 },
      { name: 'Corvette', cls: 4 },
      { name: 'Cruze', cls: 1 },
      { name: 'Epica', cls: 2 },
      { name: 'Equinox', cls: 2 },
      { name: 'Lacetti', cls: 1 },
      { name: 'Lanos', cls: 1 },
      { name: 'Malibu', cls: 2 },
      { name: 'Niva', cls: 1 },
      { name: 'Orlando', cls: 1 },
      { name: 'Spark', cls: 1 },
      { name: 'Suburban', cls: 4 },
      { name: 'Tahoe', cls: 4 },
      { name: 'Trailblazer', cls: 2 },
      { name: 'Traverse', cls: 2 },
    ],
  },
  {
    name: 'Citroen',
    models: [
      { name: 'Berlingo', cls: 1 },
      { name: 'C-Elysee', cls: 1 },
      { name: 'C3', cls: 1 },
      { name: 'C4', cls: 1 },
      { name: 'C5', cls: 2 },
      { name: 'C5 Aircross', cls: 2 },
      { name: 'Jumpy', cls: 2 },
      { name: 'SpaceTourer', cls: 2 },
    ],
  },
  {
    name: 'Datsun',
    models: [
      { name: 'mi-DO', cls: 1 },
      { name: 'on-DO', cls: 1 },
    ],
  },
  {
    name: 'Exeed',
    models: [
      { name: 'Exlantix ES', cls: 3 },
      { name: 'Exlantix ET', cls: 3 },
      { name: 'LX', cls: 2 },
      { name: 'RX', cls: 3 },
      { name: 'TXL', cls: 2 },
      { name: 'VX', cls: 3 },
    ],
  },
  {
    name: 'Ferrari',
    models: [
      { name: '296', cls: 5 },
      { name: '488', cls: 5 },
      { name: '812', cls: 5 },
      { name: 'F8', cls: 5 },
      { name: 'Portofino', cls: 5 },
      { name: 'Purosangue', cls: 5 },
      { name: 'Roma', cls: 5 },
      { name: 'SF90', cls: 5 },
    ],
  },
  {
    name: 'Ford',
    models: [
      { name: 'Bronco', cls: 2 },
      { name: 'EcoSport', cls: 1 },
      { name: 'Edge', cls: 2 },
      { name: 'Escape', cls: 2 },
      { name: 'Explorer', cls: 2 },
      { name: 'F-150', cls: 3 },
      { name: 'Fiesta', cls: 1 },
      { name: 'Focus', cls: 1 },
      { name: 'Fusion', cls: 1 },
      { name: 'Galaxy', cls: 2 },
      { name: 'Kuga', cls: 2 },
      { name: 'Mondeo', cls: 2 },
      { name: 'Mustang', cls: 3 },
      { name: 'Ranger', cls: 2 },
      { name: 'S-Max', cls: 2 },
      { name: 'Transit', cls: 2 },
    ],
  },
  {
    name: 'GAC',
    models: [
      { name: 'Aion V', cls: 2 },
      { name: 'Aion Y', cls: 1 },
      { name: 'Emkoo', cls: 2 },
      { name: 'Empow', cls: 2 },
      { name: 'GN8', cls: 2 },
      { name: 'GS3', cls: 1 },
      { name: 'GS4', cls: 2 },
      { name: 'GS5', cls: 2 },
      { name: 'GS8', cls: 2 },
      { name: 'M8', cls: 2 },
    ],
  },
  {
    name: 'Geely',
    models: [
      { name: 'Atlas', cls: 2 },
      { name: 'Atlas Pro', cls: 2 },
      { name: 'Cityray', cls: 1 },
      { name: 'Coolray', cls: 1 },
      { name: 'Emgrand', cls: 1 },
      { name: 'Emgrand 7', cls: 1 },
      { name: 'Emgrand X7', cls: 2 },
      { name: 'Galaxy E5', cls: 2 },
      { name: 'GC6', cls: 1 },
      { name: 'MK', cls: 1 },
      { name: 'Monjaro', cls: 2 },
      { name: 'Okavango', cls: 2 },
      { name: 'Preface', cls: 2 },
      { name: 'Tugella', cls: 2 },
    ],
  },
  {
    name: 'Genesis',
    models: [
      { name: 'G70', cls: 3 },
      { name: 'G80', cls: 4 },
      { name: 'G90', cls: 4 },
      { name: 'GV60', cls: 3 },
      { name: 'GV70', cls: 3 },
      { name: 'GV80', cls: 4 },
    ],
  },
  {
    name: 'Haval',
    models: [
      { name: 'Dargo', cls: 2 },
      { name: 'F7', cls: 2 },
      { name: 'F7x', cls: 2 },
      { name: 'H2', cls: 1 },
      { name: 'H3', cls: 2 },
      { name: 'H5', cls: 2 },
      { name: 'H6', cls: 2 },
      { name: 'H7', cls: 2 },
      { name: 'H9', cls: 2 },
      { name: 'Jolion', cls: 1 },
      { name: 'M6', cls: 2 },
    ],
  },
  {
    name: 'Honda',
    models: [
      { name: 'Accord', cls: 2 },
      { name: 'Civic', cls: 1 },
      { name: 'CR-V', cls: 2 },
      { name: 'Crosstour', cls: 2 },
      { name: 'Fit', cls: 1 },
      { name: 'Freed', cls: 1 },
      { name: 'HR-V', cls: 1 },
      { name: 'Insight', cls: 1 },
      { name: 'Jazz', cls: 1 },
      { name: 'Legend', cls: 3 },
      { name: 'Odyssey', cls: 2 },
      { name: 'Pilot', cls: 2 },
      { name: 'Shuttle', cls: 1 },
      { name: 'Stepwgn', cls: 2 },
      { name: 'Vezel', cls: 1 },
    ],
  },
  {
    name: 'Hongqi',
    models: [
      { name: 'E-HS9', cls: 4 },
      { name: 'E-QM5', cls: 3 },
      { name: 'H5', cls: 3 },
      { name: 'H9', cls: 4 },
      { name: 'HS3', cls: 3 },
      { name: 'HS5', cls: 3 },
      { name: 'HS7', cls: 4 },
    ],
  },
  {
    name: 'Hyundai',
    models: [
      { name: 'Accent', cls: 1 },
      { name: 'Creta', cls: 1 },
      { name: 'Custin', cls: 2 },
      { name: 'Elantra', cls: 1 },
      { name: 'Equus', cls: 3 },
      { name: 'Genesis', cls: 3 },
      { name: 'Getz', cls: 1 },
      { name: 'Grandeur', cls: 2 },
      { name: 'H-1', cls: 2 },
      { name: 'i30', cls: 1 },
      { name: 'i40', cls: 2 },
      { name: 'Ioniq 5', cls: 2 },
      { name: 'Ioniq 6', cls: 2 },
      { name: 'ix35', cls: 2 },
      { name: 'Kona', cls: 1 },
      { name: 'Mufasa', cls: 2 },
      { name: 'Palisade', cls: 2 },
      { name: 'Santa Fe', cls: 2 },
      { name: 'Solaris', cls: 1 },
      { name: 'Sonata', cls: 2 },
      { name: 'Starex', cls: 2 },
      { name: 'Staria', cls: 2 },
      { name: 'Terracan', cls: 2 },
      { name: 'Tucson', cls: 2 },
      { name: 'Veloster', cls: 1 },
    ],
  },
  {
    name: 'Infiniti',
    models: [
      { name: 'EX', cls: 3 },
      { name: 'FX', cls: 4 },
      { name: 'G', cls: 3 },
      { name: 'JX', cls: 4 },
      { name: 'M', cls: 4 },
      { name: 'Q30', cls: 3 },
      { name: 'Q50', cls: 3 },
      { name: 'Q60', cls: 3 },
      { name: 'Q70', cls: 4 },
      { name: 'QX30', cls: 3 },
      { name: 'QX50', cls: 3 },
      { name: 'QX55', cls: 3 },
      { name: 'QX56', cls: 4 },
      { name: 'QX60', cls: 4 },
      { name: 'QX70', cls: 4 },
      { name: 'QX80', cls: 4 },
    ],
  },
  {
    name: 'JAC',
    models: [
      { name: 'J7', cls: 1 },
      { name: 'JS3', cls: 1 },
      { name: 'JS4', cls: 1 },
      { name: 'JS6', cls: 2 },
      { name: 'S3', cls: 1 },
      { name: 'S7', cls: 2 },
      { name: 'T6', cls: 2 },
      { name: 'T8', cls: 2 },
      { name: 'T9', cls: 2 },
    ],
  },
  {
    name: 'Jaecoo',
    models: [
      { name: 'J5', cls: 1 },
      { name: 'J6', cls: 1 },
      { name: 'J7', cls: 2 },
      { name: 'J8', cls: 2 },
    ],
  },
  {
    name: 'Jaguar',
    models: [
      { name: 'E-Pace', cls: 3 },
      { name: 'F-Pace', cls: 4 },
      { name: 'F-Type', cls: 3 },
      { name: 'I-Pace', cls: 3 },
      { name: 'XE', cls: 3 },
      { name: 'XF', cls: 4 },
      { name: 'XJ', cls: 4 },
      { name: 'XK', cls: 3 },
    ],
  },
  {
    name: 'Jeep',
    models: [
      { name: 'Cherokee', cls: 2 },
      { name: 'Commander', cls: 3 },
      { name: 'Compass', cls: 2 },
      { name: 'Gladiator', cls: 3 },
      { name: 'Grand Cherokee', cls: 3 },
      { name: 'Grand Wagoneer', cls: 4 },
      { name: 'Renegade', cls: 1 },
      { name: 'Wagoneer', cls: 4 },
      { name: 'Wrangler', cls: 2 },
    ],
  },
  {
    name: 'Jetour',
    models: [
      { name: 'Dashing', cls: 2 },
      { name: 'T1', cls: 2 },
      { name: 'T2', cls: 2 },
      { name: 'X50', cls: 1 },
      { name: 'X70', cls: 2 },
      { name: 'X70 Plus', cls: 2 },
      { name: 'X90 Plus', cls: 2 },
    ],
  },
  {
    name: 'Kia',
    models: [
      { name: 'Carens', cls: 1 },
      { name: 'Carnival', cls: 2 },
      { name: 'Ceed', cls: 1 },
      { name: 'Cerato', cls: 1 },
      { name: 'EV6', cls: 2 },
      { name: 'EV9', cls: 2 },
      { name: 'K5', cls: 2 },
      { name: 'K8', cls: 2 },
      { name: 'K900', cls: 3 },
      { name: 'Mohave', cls: 2 },
      { name: 'Niro', cls: 1 },
      { name: 'Optima', cls: 2 },
      { name: 'Picanto', cls: 1 },
      { name: 'ProCeed', cls: 1 },
      { name: 'Quoris', cls: 3 },
      { name: 'Rio', cls: 1 },
      { name: 'Rio X', cls: 1 },
      { name: 'Seltos', cls: 1 },
      { name: 'Sorento', cls: 2 },
      { name: 'Soul', cls: 1 },
      { name: 'Sportage', cls: 2 },
      { name: 'Stinger', cls: 3 },
      { name: 'Stonic', cls: 1 },
      { name: 'Telluride', cls: 2 },
      { name: 'XCeed', cls: 1 },
    ],
  },
  {
    name: 'Lada',
    models: [
      { name: 'Классика (2101–2107)', cls: 1 },
      { name: 'Aura', cls: 1 },
      { name: 'Granta', cls: 1 },
      { name: 'Iskra', cls: 1 },
      { name: 'Kalina', cls: 1 },
      { name: 'Largus', cls: 1 },
      { name: 'Niva', cls: 1 },
      { name: 'Niva Legend', cls: 1 },
      { name: 'Niva Travel', cls: 1 },
      { name: 'Priora', cls: 1 },
      { name: 'Samara', cls: 1 },
      { name: 'Vesta', cls: 1 },
      { name: 'XRAY', cls: 1 },
    ],
  },
  {
    name: 'Lamborghini',
    models: [
      { name: 'Aventador', cls: 5 },
      { name: 'Gallardo', cls: 5 },
      { name: 'Huracan', cls: 5 },
      { name: 'Revuelto', cls: 5 },
      { name: 'Temerario', cls: 5 },
      { name: 'Urus', cls: 5 },
    ],
  },
  {
    name: 'Land Rover',
    models: [
      { name: 'Defender', cls: 4 },
      { name: 'Discovery', cls: 4 },
      { name: 'Discovery Sport', cls: 3 },
      { name: 'Freelander', cls: 3 },
      { name: 'Range Rover', cls: 5 },
      { name: 'Range Rover Evoque', cls: 3 },
      { name: 'Range Rover Sport', cls: 4 },
      { name: 'Range Rover Velar', cls: 4 },
    ],
  },
  {
    name: 'Lexus',
    models: [
      { name: 'CT', cls: 3 },
      { name: 'ES', cls: 3 },
      { name: 'GS', cls: 4 },
      { name: 'GX', cls: 4 },
      { name: 'IS', cls: 3 },
      { name: 'LC', cls: 4 },
      { name: 'LM', cls: 4 },
      { name: 'LS', cls: 4 },
      { name: 'LX', cls: 4 },
      { name: 'NX', cls: 3 },
      { name: 'RC', cls: 3 },
      { name: 'RX', cls: 4 },
      { name: 'RZ', cls: 3 },
      { name: 'TX', cls: 4 },
      { name: 'UX', cls: 3 },
    ],
  },
  {
    name: 'Li Auto',
    models: [
      { name: 'i6', cls: 3 },
      { name: 'i8', cls: 4 },
      { name: 'L6', cls: 3 },
      { name: 'L7', cls: 3 },
      { name: 'L8', cls: 4 },
      { name: 'L9', cls: 4 },
      { name: 'Mega', cls: 4 },
    ],
  },
  {
    name: 'Maserati',
    models: [
      { name: 'Ghibli', cls: 4 },
      { name: 'GranTurismo', cls: 4 },
      { name: 'Grecale', cls: 3 },
      { name: 'Levante', cls: 4 },
      { name: 'MC20', cls: 5 },
      { name: 'Quattroporte', cls: 4 },
    ],
  },
  {
    name: 'Mazda',
    models: [
      { name: '2', cls: 1 },
      { name: '3', cls: 1 },
      { name: '5', cls: 1 },
      { name: '6', cls: 2 },
      { name: 'BT-50', cls: 2 },
      { name: 'CX-3', cls: 1 },
      { name: 'CX-4', cls: 2 },
      { name: 'CX-5', cls: 2 },
      { name: 'CX-7', cls: 2 },
      { name: 'CX-8', cls: 2 },
      { name: 'CX-9', cls: 2 },
      { name: 'CX-30', cls: 1 },
      { name: 'CX-50', cls: 2 },
      { name: 'CX-60', cls: 2 },
      { name: 'CX-90', cls: 2 },
      { name: 'MX-5', cls: 1 },
      { name: 'MX-30', cls: 1 },
    ],
  },
  {
    name: 'McLaren',
    models: [
      { name: '570S', cls: 5 },
      { name: '720S', cls: 5 },
      { name: '750S', cls: 5 },
      { name: 'Artura', cls: 5 },
      { name: 'GT', cls: 5 },
    ],
  },
  {
    name: 'Mercedes-Benz',
    models: [
      { name: 'A-класс', cls: 3 },
      { name: 'AMG GT', cls: 4 },
      { name: 'B-класс', cls: 3 },
      { name: 'C-класс', cls: 3 },
      { name: 'CLA', cls: 3 },
      { name: 'CLS', cls: 4 },
      { name: 'E-класс', cls: 4 },
      { name: 'EQA', cls: 3 },
      { name: 'EQB', cls: 3 },
      { name: 'EQC', cls: 3 },
      { name: 'EQE', cls: 4 },
      { name: 'EQS', cls: 5 },
      { name: 'G-класс', cls: 4 },
      { name: 'GL', cls: 4 },
      { name: 'GLA', cls: 3 },
      { name: 'GLB', cls: 3 },
      { name: 'GLC', cls: 3 },
      { name: 'GLE', cls: 4 },
      { name: 'GLS', cls: 4 },
      { name: 'ML', cls: 4 },
      { name: 'S-класс', cls: 5 },
      { name: 'SL', cls: 4 },
      { name: 'Sprinter', cls: 3 },
      { name: 'V-класс', cls: 3 },
      { name: 'Vito', cls: 3 },
    ],
  },
  {
    name: 'Mercedes-Maybach',
    models: [
      { name: 'GLS', cls: 5 },
      { name: 'S-класс', cls: 5 },
    ],
  },
  {
    name: 'Mini',
    models: [
      { name: 'Aceman', cls: 1 },
      { name: 'Clubman', cls: 1 },
      { name: 'Cooper', cls: 1 },
      { name: 'Countryman', cls: 2 },
      { name: 'Paceman', cls: 1 },
    ],
  },
  {
    name: 'Mitsubishi',
    models: [
      { name: 'ASX', cls: 1 },
      { name: 'Colt', cls: 1 },
      { name: 'Eclipse Cross', cls: 2 },
      { name: 'Galant', cls: 2 },
      { name: 'Grandis', cls: 2 },
      { name: 'L200', cls: 2 },
      { name: 'Lancer', cls: 1 },
      { name: 'Outlander', cls: 2 },
      { name: 'Outlander XL', cls: 2 },
      { name: 'Pajero', cls: 2 },
      { name: 'Pajero Sport', cls: 2 },
      { name: 'Space Star', cls: 1 },
      { name: 'Xpander', cls: 1 },
    ],
  },
  {
    name: 'Moskvich',
    models: [
      { name: '3', cls: 1 },
      { name: '3e', cls: 1 },
      { name: '6', cls: 1 },
      { name: '8', cls: 2 },
    ],
  },
  {
    name: 'Nissan',
    models: [
      { name: 'Almera', cls: 1 },
      { name: 'Ariya', cls: 2 },
      { name: 'Juke', cls: 1 },
      { name: 'Kicks', cls: 1 },
      { name: 'Leaf', cls: 1 },
      { name: 'Maxima', cls: 2 },
      { name: 'Micra', cls: 1 },
      { name: 'Murano', cls: 2 },
      { name: 'Navara', cls: 2 },
      { name: 'Note', cls: 1 },
      { name: 'Pathfinder', cls: 2 },
      { name: 'Patrol', cls: 3 },
      { name: 'Primera', cls: 1 },
      { name: 'Qashqai', cls: 2 },
      { name: 'Rogue', cls: 2 },
      { name: 'Sentra', cls: 1 },
      { name: 'Serena', cls: 2 },
      { name: 'Teana', cls: 2 },
      { name: 'Terrano', cls: 1 },
      { name: 'Tiida', cls: 1 },
      { name: 'X-Trail', cls: 2 },
    ],
  },
  {
    name: 'Omoda',
    models: [
      { name: 'C5', cls: 1 },
      { name: 'C7', cls: 2 },
      { name: 'S5', cls: 1 },
    ],
  },
  {
    name: 'Opel',
    models: [
      { name: 'Antara', cls: 2 },
      { name: 'Astra', cls: 1 },
      { name: 'Corsa', cls: 1 },
      { name: 'Crossland', cls: 1 },
      { name: 'Grandland', cls: 2 },
      { name: 'Insignia', cls: 2 },
      { name: 'Meriva', cls: 1 },
      { name: 'Mokka', cls: 1 },
      { name: 'Vectra', cls: 1 },
      { name: 'Zafira', cls: 1 },
    ],
  },
  {
    name: 'Peugeot',
    models: [
      { name: '107', cls: 1 },
      { name: '206', cls: 1 },
      { name: '207', cls: 1 },
      { name: '208', cls: 1 },
      { name: '301', cls: 1 },
      { name: '307', cls: 1 },
      { name: '308', cls: 1 },
      { name: '408', cls: 1 },
      { name: '508', cls: 2 },
      { name: '2008', cls: 1 },
      { name: '3008', cls: 2 },
      { name: '4007', cls: 2 },
      { name: '4008', cls: 2 },
      { name: '5008', cls: 2 },
      { name: 'Expert', cls: 2 },
      { name: 'Partner', cls: 1 },
      { name: 'Traveller', cls: 2 },
    ],
  },
  {
    name: 'Porsche',
    models: [
      { name: '718', cls: 4 },
      { name: '911', cls: 5 },
      { name: 'Cayenne', cls: 4 },
      { name: 'Macan', cls: 3 },
      { name: 'Panamera', cls: 4 },
      { name: 'Taycan', cls: 4 },
    ],
  },
  {
    name: 'Renault',
    models: [
      { name: 'Arkana', cls: 1 },
      { name: 'Captur', cls: 1 },
      { name: 'Clio', cls: 1 },
      { name: 'Dokker', cls: 1 },
      { name: 'Duster', cls: 1 },
      { name: 'Espace', cls: 2 },
      { name: 'Fluence', cls: 1 },
      { name: 'Kangoo', cls: 1 },
      { name: 'Kaptur', cls: 1 },
      { name: 'Koleos', cls: 2 },
      { name: 'Laguna', cls: 1 },
      { name: 'Latitude', cls: 2 },
      { name: 'Logan', cls: 1 },
      { name: 'Master', cls: 2 },
      { name: 'Megane', cls: 1 },
      { name: 'Sandero', cls: 1 },
      { name: 'Scenic', cls: 1 },
      { name: 'Symbol', cls: 1 },
      { name: 'Talisman', cls: 2 },
      { name: 'Trafic', cls: 2 },
    ],
  },
  {
    name: 'Rolls-Royce',
    models: [
      { name: 'Cullinan', cls: 5 },
      { name: 'Dawn', cls: 5 },
      { name: 'Ghost', cls: 5 },
      { name: 'Phantom', cls: 5 },
      { name: 'Spectre', cls: 5 },
      { name: 'Wraith', cls: 5 },
    ],
  },
  {
    name: 'Skoda',
    models: [
      { name: 'Enyaq', cls: 2 },
      { name: 'Fabia', cls: 1 },
      { name: 'Kamiq', cls: 1 },
      { name: 'Karoq', cls: 1 },
      { name: 'Kodiaq', cls: 2 },
      { name: 'Octavia', cls: 1 },
      { name: 'Rapid', cls: 1 },
      { name: 'Roomster', cls: 1 },
      { name: 'Scala', cls: 1 },
      { name: 'Superb', cls: 2 },
      { name: 'Yeti', cls: 1 },
    ],
  },
  {
    name: 'Solaris',
    models: [
      { name: 'HC', cls: 1 },
      { name: 'HS', cls: 2 },
      { name: 'KRS', cls: 1 },
      { name: 'KRX', cls: 1 },
    ],
  },
  {
    name: 'SsangYong',
    models: [
      { name: 'Actyon', cls: 1 },
      { name: 'Korando', cls: 1 },
      { name: 'Kyron', cls: 2 },
      { name: 'Musso', cls: 2 },
      { name: 'Rexton', cls: 2 },
      { name: 'Stavic', cls: 2 },
      { name: 'Tivoli', cls: 1 },
      { name: 'Torres', cls: 2 },
    ],
  },
  {
    name: 'Subaru',
    models: [
      { name: 'Ascent', cls: 2 },
      { name: 'BRZ', cls: 1 },
      { name: 'Crosstrek', cls: 1 },
      { name: 'Forester', cls: 2 },
      { name: 'Impreza', cls: 1 },
      { name: 'Legacy', cls: 2 },
      { name: 'Levorg', cls: 1 },
      { name: 'Outback', cls: 2 },
      { name: 'Solterra', cls: 2 },
      { name: 'Tribeca', cls: 2 },
      { name: 'WRX', cls: 1 },
      { name: 'XV', cls: 1 },
    ],
  },
  {
    name: 'Suzuki',
    models: [
      { name: 'Baleno', cls: 1 },
      { name: 'Grand Vitara', cls: 1 },
      { name: 'Ignis', cls: 1 },
      { name: 'Jimny', cls: 1 },
      { name: 'Kizashi', cls: 2 },
      { name: 'Liana', cls: 1 },
      { name: 'Splash', cls: 1 },
      { name: 'Swift', cls: 1 },
      { name: 'SX4', cls: 1 },
      { name: 'Vitara', cls: 1 },
    ],
  },
  {
    name: 'Tank',
    models: [
      { name: '300', cls: 2 },
      { name: '400', cls: 3 },
      { name: '500', cls: 3 },
      { name: '700', cls: 4 },
    ],
  },
  {
    name: 'Tesla',
    models: [
      { name: 'Cybertruck', cls: 4 },
      { name: 'Model 3', cls: 3 },
      { name: 'Model S', cls: 4 },
      { name: 'Model X', cls: 4 },
      { name: 'Model Y', cls: 3 },
    ],
  },
  {
    name: 'Toyota',
    models: [
      { name: '4Runner', cls: 2 },
      { name: 'Alphard', cls: 3 },
      { name: 'Avensis', cls: 2 },
      { name: 'bZ4X', cls: 2 },
      { name: 'C-HR', cls: 1 },
      { name: 'Camry', cls: 2 },
      { name: 'Corolla', cls: 1 },
      { name: 'Corolla Cross', cls: 1 },
      { name: 'Crown', cls: 2 },
      { name: 'Fortuner', cls: 2 },
      { name: 'Highlander', cls: 3 },
      { name: 'Hilux', cls: 2 },
      { name: 'Land Cruiser 100', cls: 3 },
      { name: 'Land Cruiser 200', cls: 3 },
      { name: 'Land Cruiser 300', cls: 3 },
      { name: 'Land Cruiser Prado', cls: 2 },
      { name: 'Prius', cls: 1 },
      { name: 'RAV4', cls: 2 },
      { name: 'Sienna', cls: 2 },
      { name: 'Vellfire', cls: 3 },
      { name: 'Venza', cls: 2 },
      { name: 'Yaris', cls: 1 },
      { name: 'Yaris Cross', cls: 1 },
    ],
  },
  {
    name: 'UAZ',
    models: [
      { name: 'СГР (Буханка)', cls: 1 },
      { name: 'Hunter', cls: 1 },
      { name: 'Patriot', cls: 2 },
      { name: 'Pickup', cls: 2 },
      { name: 'Profi', cls: 2 },
    ],
  },
  {
    name: 'Volkswagen',
    models: [
      { name: 'Amarok', cls: 2 },
      { name: 'Arteon', cls: 2 },
      { name: 'Caddy', cls: 1 },
      { name: 'Caravelle', cls: 2 },
      { name: 'Golf', cls: 1 },
      { name: 'ID.3', cls: 1 },
      { name: 'ID.4', cls: 2 },
      { name: 'ID.6', cls: 2 },
      { name: 'Jetta', cls: 1 },
      { name: 'Multivan', cls: 2 },
      { name: 'Passat', cls: 2 },
      { name: 'Passat CC', cls: 2 },
      { name: 'Phaeton', cls: 3 },
      { name: 'Polo', cls: 1 },
      { name: 'T-Cross', cls: 1 },
      { name: 'T-Roc', cls: 1 },
      { name: 'Talagon', cls: 2 },
      { name: 'Taos', cls: 1 },
      { name: 'Tayron', cls: 2 },
      { name: 'Teramont', cls: 2 },
      { name: 'Tiguan', cls: 2 },
      { name: 'Touareg', cls: 3 },
      { name: 'Touran', cls: 1 },
      { name: 'Transporter', cls: 2 },
    ],
  },
  {
    name: 'Volvo',
    models: [
      { name: 'C30', cls: 3 },
      { name: 'C40', cls: 3 },
      { name: 'EX30', cls: 3 },
      { name: 'EX90', cls: 4 },
      { name: 'S40', cls: 3 },
      { name: 'S60', cls: 3 },
      { name: 'S80', cls: 4 },
      { name: 'S90', cls: 4 },
      { name: 'V40', cls: 3 },
      { name: 'V60', cls: 3 },
      { name: 'V90', cls: 4 },
      { name: 'XC40', cls: 3 },
      { name: 'XC60', cls: 3 },
      { name: 'XC70', cls: 3 },
      { name: 'XC90', cls: 4 },
    ],
  },
  {
    name: 'Voyah',
    models: [
      { name: 'Courage', cls: 3 },
      { name: 'Dream', cls: 4 },
      { name: 'Free', cls: 3 },
      { name: 'Passion', cls: 4 },
    ],
  },
  {
    name: 'Xcite',
    models: [
      { name: 'X-Cross 7', cls: 2 },
      { name: 'X-Cross 8', cls: 2 },
    ],
  },
  {
    name: 'Zeekr',
    models: [
      { name: '001', cls: 3 },
      { name: '007', cls: 3 },
      { name: '7X', cls: 3 },
      { name: '009', cls: 4 },
      { name: '9X', cls: 4 },
      { name: 'X', cls: 3 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Кириллические написания (для поиска). Ключи — в нижнем регистре.   */
/* ------------------------------------------------------------------ */

/** «бмв» → «BMW». Многословные ключи («ленд ровер») допустимы. */
const BRAND_ALIASES: Readonly<Record<string, string>> = {
  'акура': 'Acura',
  'айто': 'Aito',
  'альфа ромео': 'Alfa Romeo',
  'астон мартин': 'Aston Martin',
  'ауди': 'Audi',
  'аурус': 'Aurus',
  'аватр': 'Avatr',
  'баик': 'BAIC',
  'бэйк': 'BAIC',
  'белджи': 'Belgee',
  'бентли': 'Bentley',
  'бмв': 'BMW',
  'бид': 'BYD',
  'бивайди': 'BYD',
  'кадиллак': 'Cadillac',
  'чанган': 'Changan',
  'чери': 'Chery',
  'черри': 'Chery',
  'шевроле': 'Chevrolet',
  'шевролет': 'Chevrolet',
  'крайслер': 'Chrysler',
  'ситроен': 'Citroen',
  'датсун': 'Datsun',
  'додж': 'Dodge',
  'донгфенг': 'Dongfeng',
  'дунфэн': 'Dongfeng',
  'эволют': 'Evolute',
  'эксид': 'Exeed',
  'эксит': 'Exeed',
  'фав': 'FAW',
  'феррари': 'Ferrari',
  'фиат': 'Fiat',
  'форд': 'Ford',
  'гак': 'GAC',
  'джили': 'Geely',
  'гили': 'Geely',
  'генезис': 'Genesis',
  'дженезис': 'Genesis',
  'джимси': 'GMC',
  'грейт вол': 'Great Wall',
  'грейт волл': 'Great Wall',
  'хавал': 'Haval',
  'хавейл': 'Haval',
  'хонда': 'Honda',
  'хонгчи': 'Hongqi',
  'хунци': 'Hongqi',
  'хаммер': 'Hummer',
  'хендай': 'Hyundai',
  'хундай': 'Hyundai',
  'хендэ': 'Hyundai',
  'хюндай': 'Hyundai',
  'инфинити': 'Infiniti',
  'джак': 'JAC',
  'джаеку': 'Jaecoo',
  'джейку': 'Jaecoo',
  'ягуар': 'Jaguar',
  'джип': 'Jeep',
  'джетур': 'Jetour',
  'кайи': 'Kaiyi',
  'киа': 'Kia',
  'лада': 'Lada',
  'ваз': 'Lada',
  'ламборгини': 'Lamborghini',
  'ламборджини': 'Lamborghini',
  'ленд ровер': 'Land Rover',
  'лэнд ровер': 'Land Rover',
  'рендж ровер': 'Land Rover Range Rover',
  'рэндж ровер': 'Land Rover Range Rover',
  'лексус': 'Lexus',
  'ли авто': 'Li Auto',
  'лисян': 'Li Auto',
  'ликсианг': 'Li Auto',
  'лифан': 'Lifan',
  'линкольн': 'Lincoln',
  'ливан': 'Livan',
  'мазерати': 'Maserati',
  'мазда': 'Mazda',
  'макларен': 'McLaren',
  'мерседес': 'Mercedes-Benz',
  'мерседес бенц': 'Mercedes-Benz',
  'мерс': 'Mercedes-Benz',
  'майбах': 'Mercedes-Maybach',
  'мини': 'Mini',
  'мицубиси': 'Mitsubishi',
  'митсубиси': 'Mitsubishi',
  'мицубиши': 'Mitsubishi',
  'москвич': 'Moskvich',
  'нио': 'Nio',
  'ниссан': 'Nissan',
  'омода': 'Omoda',
  'опель': 'Opel',
  'ора': 'Ora',
  'пежо': 'Peugeot',
  'порше': 'Porsche',
  'порш': 'Porsche',
  'рам': 'RAM',
  'рено': 'Renault',
  'роллс ройс': 'Rolls-Royce',
  'ролс ройс': 'Rolls-Royce',
  'сеат': 'Seat',
  'шкода': 'Skoda',
  'смарт': 'Smart',
  'солярис': 'Solaris',
  'соллерс': 'Sollers',
  'ссанг йонг': 'SsangYong',
  'санг йонг': 'SsangYong',
  'ссангйонг': 'SsangYong',
  'субару': 'Subaru',
  'сузуки': 'Suzuki',
  'танк': 'Tank',
  'тесла': 'Tesla',
  'тойота': 'Toyota',
  'уаз': 'UAZ',
  'фольксваген': 'Volkswagen',
  'фольцваген': 'Volkswagen',
  'вольксваген': 'Volkswagen',
  'vw': 'Volkswagen',
  'вольво': 'Volvo',
  'воях': 'Voyah',
  'вояж': 'Voyah',
  'вей': 'Wey',
  'иксайт': 'Xcite',
  'ксайт': 'Xcite',
  'экспенг': 'Xpeng',
  'зикр': 'Zeekr',
  'зикер': 'Zeekr',
};

/** Кириллические написания популярных моделей → латинское имя в справочнике. */
const MODEL_ALIASES: Readonly<Record<string, string>> = {
  'икс': 'X',
  'камри': 'Camry',
  'королла': 'Corolla',
  'рав4': 'RAV4',
  'рав 4': 'RAV4',
  'равчик': 'RAV4',
  'прадо': 'Land Cruiser Prado',
  'крузак': 'Land Cruiser',
  'крузер': 'Cruiser',
  'ленд крузер': 'Land Cruiser',
  'лэнд крузер': 'Land Cruiser',
  'хайлендер': 'Highlander',
  'альфард': 'Alphard',
  'солярис': 'Solaris',
  'крета': 'Creta',
  'туссан': 'Tucson',
  'туксон': 'Tucson',
  'соната': 'Sonata',
  'санта фе': 'Santa Fe',
  'сантафе': 'Santa Fe',
  'элантра': 'Elantra',
  'палисад': 'Palisade',
  'рио': 'Rio',
  'сид': 'Ceed',
  'церато': 'Cerato',
  'спортейдж': 'Sportage',
  'спортаж': 'Sportage',
  'соренто': 'Sorento',
  'оптима': 'Optima',
  'селтос': 'Seltos',
  'карнивал': 'Carnival',
  'мохав': 'Mohave',
  'поло': 'Polo',
  'гольф': 'Golf',
  'джетта': 'Jetta',
  'пассат': 'Passat',
  'тигуан': 'Tiguan',
  'туарег': 'Touareg',
  'терамонт': 'Teramont',
  'мультиван': 'Multivan',
  'октавия': 'Octavia',
  'рапид': 'Rapid',
  'кодиак': 'Kodiaq',
  'карок': 'Karoq',
  'суперб': 'Superb',
  'фабия': 'Fabia',
  'логан': 'Logan',
  'сандеро': 'Sandero',
  'дастер': 'Duster',
  'каптур': 'Kaptur',
  'аркана': 'Arkana',
  'фокус': 'Focus',
  'куга': 'Kuga',
  'мондео': 'Mondeo',
  'эксплорер': 'Explorer',
  'мустанг': 'Mustang',
  'кашкай': 'Qashqai',
  'икстрейл': 'X-Trail',
  'х-трейл': 'X-Trail',
  'х трейл': 'X-Trail',
  'альмера': 'Almera',
  'мурано': 'Murano',
  'патрол': 'Patrol',
  'патфайндер': 'Pathfinder',
  'теана': 'Teana',
  'жук': 'Juke',
  'аутлендер': 'Outlander',
  'паджеро': 'Pajero',
  'лансер': 'Lancer',
  'аккорд': 'Accord',
  'цивик': 'Civic',
  'форестер': 'Forester',
  'аутбек': 'Outback',
  'импреза': 'Impreza',
  'витара': 'Vitara',
  'джимни': 'Jimny',
  'гранта': 'Granta',
  'веста': 'Vesta',
  'ларгус': 'Largus',
  'нива': 'Niva',
  'калина': 'Kalina',
  'приора': 'Priora',
  'икс рей': 'XRAY',
  'иксрей': 'XRAY',
  'патриот': 'Patriot',
  'хантер': 'Hunter',
  'буханка': 'СГР (Буханка)',
  'джолион': 'Jolion',
  'дарго': 'Dargo',
  'тигго': 'Tiggo',
  'тиго': 'Tiggo',
  'кулрей': 'Coolray',
  'атлас': 'Atlas',
  'монджаро': 'Monjaro',
  'тугелла': 'Tugella',
  'каен': 'Cayenne',
  'кайен': 'Cayenne',
  'кайенн': 'Cayenne',
  'макан': 'Macan',
  'панамера': 'Panamera',
  'тайкан': 'Taycan',
  'гелик': 'G-класс',
  'гелендваген': 'G-класс',
  'а класс': 'A-класс',
  'б класс': 'B-класс',
  'с класс': 'C-класс',
  'ц класс': 'C-класс',
  'е класс': 'E-класс',
  'г класс': 'G-класс',
  'в класс': 'V-класс',
  'эс класс': 'S-класс',
  'модель 3': 'Model 3',
  'модель s': 'Model S',
  'модель x': 'Model X',
  'модель y': 'Model Y',
  'модел 3': 'Model 3',
  'эскалейд': 'Escalade',
  'дефендер': 'Defender',
  'дискавери': 'Discovery',
  'эвок': 'Range Rover Evoque',
  'велар': 'Range Rover Velar',
  'урус': 'Urus',
  'бентайга': 'Bentayga',
  'куллинан': 'Cullinan',
  'фантом': 'Phantom',
  'гост': 'Ghost',
};

/* ------------------------------------------------------------------ */
/*  Нормализация и «фонетический» ключ                                 */
/* ------------------------------------------------------------------ */

/** Нижний регистр, ё→е, дефисы → пробел, схлопнутые пробелы. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[-–—_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CYR_TO_LAT: Readonly<Record<string, string>> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e',
  ю: 'u', я: 'a',
};

/**
 * Грубый фонетический ключ: латиница и кириллица приводятся к общему виду,
 * чтобы «камри» ≈ «camry», «кашкай» ≈ «qashqai» без полного словаря alias-ов.
 */
function phonetic(input: string): string {
  let t = normalize(input);
  // Латинские диграфы защищаем от правила «c → k/s»
  t = t
    .replace(/sch/g, 'š')
    .replace(/ch/g, 'č')
    .replace(/sh/g, 'š')
    .replace(/zh/g, 'ž')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ck/g, 'k')
    .replace(/qu/g, 'kv')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/w/g, 'v')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/ou/g, 'u')
    .replace(/y/g, 'i')
    .replace(/j/g, 'dž')
    .replace(/č/g, 'ch')
    .replace(/š/g, 'sh')
    .replace(/ž/g, 'zh');
  t = t.replace(/[а-я]/g, (ch) => CYR_TO_LAT[ch] ?? ch);
  return t.replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface AliasRule {
  re: RegExp;
  to: string;
}

function buildAliasRules(dict: Readonly<Record<string, string>>): AliasRule[] {
  return Object.entries(dict)
    .map(([from, to]) => ({ from: normalize(from), to: normalize(to) }))
    .filter((r) => r.from.length > 0)
    .sort((a, b) => b.from.length - a.from.length)
    .map((r) => ({
      // Целое слово/фраза: перед — начало строки или пробел, после — пробел или конец
      re: new RegExp('(^|\\s)' + escapeRegExp(r.from) + '(?=\\s|$)', 'g'),
      to: '$1' + r.to,
    }));
}

const ALIAS_RULES: AliasRule[] = [
  ...buildAliasRules(BRAND_ALIASES),
  ...buildAliasRules(MODEL_ALIASES),
];

/** Применяет alias-словари и превращает «х5» (кириллическая х) в «x5». */
function expandQuery(q: string): string {
  let t = normalize(q);
  for (const rule of ALIAS_RULES) t = t.replace(rule.re, rule.to);
  return t.replace(/х(?=\d)/g, 'x').replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/*  Индекс                                                              */
/* ------------------------------------------------------------------ */

interface IndexEntry extends CarSearchResult {
  full: string;
  modelN: string;
  fullKey: string;
  modelKey: string;
}

let indexCache: IndexEntry[] | null = null;

function getIndex(): IndexEntry[] {
  if (indexCache) return indexCache;
  const list: IndexEntry[] = [];
  for (const brand of CAR_CATALOG) {
    for (const model of brand.models) {
      const full = normalize(brand.name + ' ' + model.name);
      list.push({
        brand: brand.name,
        model: model.name,
        cls: model.cls,
        full,
        modelN: normalize(model.name),
        fullKey: phonetic(full),
        modelKey: phonetic(model.name),
      });
    }
  }
  indexCache = list;
  return list;
}

/* ------------------------------------------------------------------ */
/*  Публичное API                                                       */
/* ------------------------------------------------------------------ */

/**
 * Точный поиск класса по марке и модели (без учёта регистра и лишних пробелов).
 * Для марки принимаются и кириллические alias-ы («тойота»). Нет в справочнике → null.
 */
export function findCarClass(brand: string, model: string): CarClassId | null {
  const b = expandQuery(brand);
  const m = normalize(model);
  if (!b || !m) return null;
  for (const entry of CAR_CATALOG) {
    if (normalize(entry.name) !== b) continue;
    for (const item of entry.models) {
      if (normalize(item.name) === m) return item.cls;
    }
    return null;
  }
  return null;
}

/**
 * Поиск по подстроке «марка модель» (регистр, латиница/кириллица и дефисы не важны).
 * Ранжирование: совпадение с начала «марка модель» → начало модели → подстрока;
 * затем то же по фонетическому ключу. Внутри ранга — короче модель, потом алфавит.
 */
export function searchCars(query: string, limit = 8): CarSearchResult[] {
  const q = expandQuery(query);
  if (!q || limit <= 0) return [];
  const qKey = phonetic(q);

  const scored: { entry: IndexEntry; rank: number }[] = [];
  for (const entry of getIndex()) {
    let rank = -1;
    if (entry.full.startsWith(q)) rank = 0;
    else if (entry.modelN.startsWith(q)) rank = 1;
    else if (entry.full.includes(q)) rank = 2;
    else if (qKey) {
      if (entry.fullKey.startsWith(qKey)) rank = 3;
      else if (entry.modelKey.startsWith(qKey)) rank = 4;
      else if (entry.fullKey.includes(qKey)) rank = 5;
    }
    if (rank >= 0) scored.push({ entry, rank });
  }

  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.entry.model.length !== b.entry.model.length) return a.entry.model.length - b.entry.model.length;
    const byBrand = a.entry.brand.localeCompare(b.entry.brand, 'en');
    if (byBrand !== 0) return byBrand;
    return a.entry.model.localeCompare(b.entry.model, 'ru', { numeric: true });
  });

  return scored.slice(0, limit).map(({ entry }) => ({
    brand: entry.brand,
    model: entry.model,
    cls: entry.cls,
  }));
}
