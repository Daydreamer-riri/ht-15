import { getDefaultStore, useAtomValue } from 'jotai';
import arrow from '@/assets/arrow.png';
import bg from '@/assets/bg.png';
import qrcodebg from '@/assets/qrcode-bg.png';
import { FONT_FAMILY_NORMAL } from '@/lib/font';
import { avatarAtom, highlightAtom, jobAchievementAtom, nameAtom, qrcodeAtom, serviceExperienceAtom, travelExperienceAtom } from '@/store';

const store = getDefaultStore();

export function Playground() {
  useAtomValue(avatarAtom);
  useAtomValue(nameAtom);
  useAtomValue(highlightAtom);
  useAtomValue(jobAchievementAtom);
  useAtomValue(travelExperienceAtom);
  useAtomValue(serviceExperienceAtom);
  useAtomValue(qrcodeAtom);

  return (
    <div className="flex-1">
      <OpCard />
    </div>
  );
}

export function OpCard() {
  return (
    <div style={{ width: 620, height: 934, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          width: 596,
          height: 815,
          backgroundImage: `linear-gradient(0deg, #e9f1f9 220px, #fff 270px, rgb(255, 255, 255) 27.16%, rgb(220, 236, 255) 93.64%, rgb(184, 216, 255) 156.86%)`,
          borderRadius: 16,
          left: 12,
          top: 95,
          position: 'absolute',
          display: 'flex',
        }}
      >
        <img
          src={bg}
          style={{
            objectFit: 'contain',
            width: 596,
            height: 596 / 149 * 125,
          }}
        />
      </div>
      <div style={{ position: 'relative', display: 'flex' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {store.get(avatarAtom) ? (
            <img
              src={URL.createObjectURL(store.get(avatarAtom)!)}
              style={{ width: 276, height: 276, objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: 184.75, height: 276 }} />
          )}
          <div
            style={{
              width: 262,
              height: 48,
              marginTop: -8,
              fontSize: 24,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(-180deg, rgb(7, 77, 158) -49.3%, rgb(17, 17, 17) 100%)',
              borderRadius: 8,
              lineHeight: '44px',
            }}
          >
            携程官方推荐导购
          </div>
          <div
            style={{
              height: 73,
              fontWeight: 600,
              fontFamily: FONT_FAMILY_NORMAL,
              fontSize: 52,
              backgroundImage: 'linear-gradient(-147.4deg, rgb(0, 119, 255) -13.03%, rgb(17, 17, 17) 60.19%, rgb(17, 17, 17) 126.28%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              marginTop: 17,
              display: 'flex',
            }}
          >
            {store.get(nameAtom)}
          </div>
          <div
            style={{
              height: 45,
              color: '#0f4999',
              fontSize: 32,
              fontWeight: 600,
              fontFamily: FONT_FAMILY_NORMAL,
              display: 'flex',
            }}
          >
            <span
              style={{
                position: 'relative',
              }}
            >
              <span style={{ position: 'absolute', display: 'flex', height: 11, width: '80%', background: '#006FF6', opacity: 0.2, left: '10%', bottom: 0, zIndex: '0' }} />
              <span style={{ zIndex: '1', position: 'relative' }}>
                “ {store.get(highlightAtom)} ”
              </span>
            </span>
          </div>
          <div style={{ width: 519, height: 252, color: '#111111', fontSize: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12 }}>
              <span style={{ flexShrink: 0 }}>岗位成就：</span>
              <span style={{ width: 387 }}>{store.get(jobAchievementAtom)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12 }}>
              <span style={{ flexShrink: 0 }}>旅行经历：</span>
              <span style={{ width: 387 }}>{store.get(travelExperienceAtom)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12 }}>
              <span style={{ flexShrink: 0 }}>服务经历：</span>
              <span style={{ width: 387 }}>{store.get(serviceExperienceAtom)}</span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          width: 620,
          height: 230,
          borderRadius: '0 0 16px 16px',
          backgroundImage: 'linear-gradient(-180deg, rgb(204, 228, 255) 0%, rgb(255, 255, 255) 57.36%)',
          position: 'absolute',
          bottom: 0,
          left: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid #fff',
        }}
      >
        <div style={{
          width: 12,
          height: 14,
          backgroundImage: 'linear-gradient(-49.4deg, #3C66CE 50%, rgba(255, 255, 255, 0) 50%)',
          position: 'absolute',
          left: 0,
          top: -14,
        }}
        />
        <div style={{
          width: 12,
          height: 14,
          backgroundImage: 'linear-gradient(49.4deg, #3C66CE 50%, rgba(255, 255, 255, 0) 50%)',
          position: 'absolute',
          right: 0,
          top: -14,
        }}
        />
        <div style={{ width: 523, height: 158, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#555555', fontSize: 24, display: 'flex' }}>
              保存图片，微信扫一扫
            </div>
            <div
              style={{
                color: 'transparent',
                backgroundImage: 'linear-gradient(-108.06deg, rgb(0, 119, 255) -3.88%, rgb(17, 17, 17) 55.97%, rgb(17, 17, 17) 140.68%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                fontSize: 28,
                fontWeight: 600,
                display: 'flex',
              }}
            >
              咨询预定更及时
            </div>
          </div>
          <img
            src={arrow}
            style={{ position: 'absolute', width: 118, height: 33, left: 276, top: 110 }}
          />
          <div
            style={{
              width: 158,
              height: 158,
              position: 'relative',
              display: 'flex',
              // backgroundImage: `url(${qrcodebg})`,
              padding: 4,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <img
              src={qrcodebg}
              style={{ position: 'absolute', width: 158, height: 158, left: 0, top: 0 }}
            />
            {store.get(qrcodeAtom) ? (
              <img
                src={URL.createObjectURL(store.get(qrcodeAtom)!)}
                style={{
                  width: 142,
                  height: 142,
                  objectFit: 'cover',
                  borderRadius: 4,
                  position: 'relative',
                }}
              />
            ) : (
              <div style={{ width: 158, height: 158, borderRadius: 8 }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
