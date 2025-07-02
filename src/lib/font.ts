let fontCache: {
  bold?: ArrayBuffer;
  notoSansSC_regular?: ArrayBuffer;
  notoSansSC_bold?: ArrayBuffer;
} = {};

export async function loadFonts() {
  if (fontCache.bold && fontCache.notoSansSC_regular && fontCache.notoSansSC_bold) {
    return fontCache;
  }

  try {
    const [notoSansData_regular, notoSansData_bold] = await Promise.all([
      // fontCache.bold || fetch('https://docs.c-ctrip.com/files/7/ttl_post_share_repo/CtripType-Bold.otf')
      //   .then(res => res.arrayBuffer())
      //   .catch(err => {
      //     console.error('Failed to load CtripType-Bold font:', err);
      //     throw err;
      //   }),
      fontCache.notoSansSC_regular || fetch('https://docs.c-ctrip.com/files/7/ttl_post_share_repo/NotoSansSC-Regular.ttf')
        .then(res => res.arrayBuffer())
        .catch(err => {
          console.error('Failed to load NotoSansSC font:', err);
          throw err;
        }),
      fontCache.notoSansSC_bold || fetch('https://docs.c-ctrip.com/files/7/ttl_post_share_repo/NotoSansSC-Bold.ttf')
        .then(res => res.arrayBuffer())
        .catch(err => {
          console.error('Failed to load NotoSansSC font:', err);
          throw err;
        }),
    ]);

    fontCache = {
      // bold: boldData,
      notoSansSC_regular: notoSansData_regular,
      notoSansSC_bold: notoSansData_bold,
    };

    return fontCache;
  } catch (error) {
    console.error('Error loading fonts:', error);
    throw error;
  }
}
export const SECONDARY_COLOR = '#fff572';
export const FONT_FAMILY_NORMAL = 'NotoSansSC';

loadFonts().then(fonts => {
  Object
    .entries(fonts)
    .forEach(([key, buffer]) => {
      const font = new FontFace(
        key === 'bold' ? 'CtripType-Bold' : 'NotoSansSC',
        buffer,
        key === 'bold' ? {} : { weight: key === 'notoSansSC_bold' ? '600' : '400' },
      );
      if (document.fonts) {
        document.fonts.add((font));
      }
    });
}).catch(err => console.error('Failed to load fonts for main thread document:', err));

document.documentElement.style.fontFamily = `${FONT_FAMILY_NORMAL}, system-ui, sans-serif`;
