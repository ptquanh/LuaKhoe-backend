export enum RiceDiseaseClass {
  BACTERIAL_BLIGHT = 'Bacterial Blight',
  BROWN_SPOT = 'Brown Spot',
  RICE_BLAST = 'Rice Blast',
  RICE_TUNGRO = 'Rice Tungro',
  SHEATH_BLIGHT = 'Sheath Blight',
}

export enum RiceDiseaseVietnamese {
  BACTERIAL_BLIGHT = 'Bệnh Bạc Lá (Bacterial Blight)',
  BROWN_SPOT = 'Bệnh Đốm Nâu (Brown Spot)',
  RICE_BLAST = 'Bệnh Đạo Ôn (Rice Blast)',
  RICE_TUNGRO = 'Bệnh Vàng Lụi Tungro',
  SHEATH_BLIGHT = 'Bệnh Khô Vằn (Sheath Blight)',
}

interface DiseaseMapping {
  diseaseClass: RiceDiseaseClass;
  vietnameseName: RiceDiseaseVietnamese;
}

const diseaseMappings: DiseaseMapping[] = [
  { diseaseClass: RiceDiseaseClass.BACTERIAL_BLIGHT, vietnameseName: RiceDiseaseVietnamese.BACTERIAL_BLIGHT },
  { diseaseClass: RiceDiseaseClass.BROWN_SPOT, vietnameseName: RiceDiseaseVietnamese.BROWN_SPOT },
  { diseaseClass: RiceDiseaseClass.RICE_BLAST, vietnameseName: RiceDiseaseVietnamese.RICE_BLAST },
  { diseaseClass: RiceDiseaseClass.RICE_TUNGRO, vietnameseName: RiceDiseaseVietnamese.RICE_TUNGRO },
  { diseaseClass: RiceDiseaseClass.SHEATH_BLIGHT, vietnameseName: RiceDiseaseVietnamese.SHEATH_BLIGHT },
];

/**
 * Map predicted disease name to Vietnamese enum.
 * Returns null if healthy, unknown, or not learned.
 */
export function getVietnameseDiseaseName(diseaseName: string): string | null {
  if (!diseaseName) return null;
  const lower = diseaseName.toLowerCase();

  for (const mapping of diseaseMappings) {
    if (lower.includes(mapping.diseaseClass.toLowerCase())) {
      return mapping.vietnameseName;
    }
  }

  return null;
}

