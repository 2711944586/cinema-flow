export const GENERIC_DIRECTOR_PORTRAIT_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Clapperboard_Icon_-_nospace.png/500px-Clapperboard_Icon_-_nospace.png';

export const DIRECTOR_PORTRAIT_URLS: Record<string, string> = {
  '克里斯托弗·诺兰': 'https://upload.wikimedia.org/wikipedia/commons/4/49/ChrisNolanBFI150224_%2810_of_12%29_%2853532289710%29_%28cropped2%29.jpg',
  '诺兰': 'https://upload.wikimedia.org/wikipedia/commons/4/49/ChrisNolanBFI150224_%2810_of_12%29_%2853532289710%29_%28cropped2%29.jpg',
  '李安': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/2016_NAB_Show%27s_The_Future_of_Cinema_Conference%2C_produced_in_partnership_with_SMPTE_%2826717112630%29_%28cropped%29.jpg/960px-2016_NAB_Show%27s_The_Future_of_Cinema_Conference%2C_produced_in_partnership_with_SMPTE_%2826717112630%29_%28cropped%29.jpg',
  '宫崎骏': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/HayaoMiyazakiCCJuly09.jpg',
  '王家卫': 'https://upload.wikimedia.org/wikipedia/commons/7/76/Wong_Kar-wai_Berlin_cropped.jpg',
  '丹尼斯·维伦纽瓦': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Denis_Villeneuve_Cannes_2018.jpg/640px-Denis_Villeneuve_Cannes_2018.jpg',
  '弗兰克·德拉邦特': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Frank_Darabont_by_Gage_Skidmore.jpg/640px-Frank_Darabont_by_Gage_Skidmore.jpg',
  '郭帆': GENERIC_DIRECTOR_PORTRAIT_URL
};

export function resolveDirectorPortraitUrl(name: string | undefined): string {
  const normalizedName = name?.trim() ?? '';
  return DIRECTOR_PORTRAIT_URLS[normalizedName] ?? GENERIC_DIRECTOR_PORTRAIT_URL;
}
