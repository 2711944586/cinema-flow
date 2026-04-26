const KNOWN_DIRECTOR_IDS = new Map<string, number>([
  ['克里斯托弗·诺兰', 1],
  ['诺兰', 1],
  ['Christopher Nolan', 1],
  ['李安', 2],
  ['Ang Lee', 2],
  ['宫崎骏', 3],
  ['Hayao Miyazaki', 3],
  ['王家卫', 4],
  ['Wong Kar-wai', 4],
  ['丹尼斯·维伦纽瓦', 5],
  ['Denis Villeneuve', 5],
  ['弗兰克·德拉邦特', 6],
  ['Frank Darabont', 6],
  ['郭帆', 7],
  ['Quentin Tarantino', 8],
  ['昆汀·塔伦蒂诺', 8]
]);

export function buildDirectorId(name: string | undefined): number {
  const normalizedName = name?.trim() ?? '';
  const knownId = KNOWN_DIRECTOR_IDS.get(normalizedName);

  if (knownId) {
    return knownId;
  }

  const hash = Array.from(normalizedName || 'unknown-director').reduce((value, char) => {
    return ((value << 5) - value + char.charCodeAt(0)) | 0;
  }, 0);

  return 1000 + Math.abs(hash % 8000);
}
