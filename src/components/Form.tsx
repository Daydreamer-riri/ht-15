import { useAtom } from 'jotai';
import { Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { copyImage, downloadImage } from '@/lib/gen';
import { avatarAtom, highlightAtom, jobAchievementAtom, nameAtom, qrcodeAtom, serviceExperienceAtom, travelExperienceAtom } from '@/store';
import { Button } from './ui/button';
import { Card, CardAction, CardContent, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function Form() {
  const [name, setName] = useAtom(nameAtom);
  const [avatar, setAvatar] = useAtom(avatarAtom);
  const [highlight, setHighlight] = useAtom(highlightAtom);
  const [jobAchievement, setJobAchievement] = useAtom(jobAchievementAtom);
  const [travelExperience, setTravelExperience] = useAtom(travelExperienceAtom);
  const [serviceExperience, setServiceExperience] = useAtom(serviceExperienceAtom);
  const [qrcode, setQrcode] = useAtom(qrcodeAtom);

  return (
    <Card className="flex-1">
      <CardContent>
        <form>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avatar">头像</Label>
              <Input
                id="avatar"
                type="file"
                required
                onChange={e => setAvatar(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="highlight">亮点</Label>
              <Input
                id="highlight"
                required
                maxLength={15}
                value={highlight}
                onChange={e => setHighlight(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="岗位成就">岗位成就</Label>
              <Input
                id="岗位成就"
                required
                value={jobAchievement}
                onChange={e => setJobAchievement(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="旅行经历">旅行经历</Label>
              <Input
                id="旅行经历"
                required
                value={travelExperience}
                onChange={e => setTravelExperience(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="服务经历">服务经历</Label>
              <Input
                id="服务经历"
                required
                value={serviceExperience}
                onChange={e => setServiceExperience(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qrcode">二维码</Label>
              <Input
                id="qrcode"
                type="file"
                required
                onChange={e => setQrcode(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <CardAction className="gap-2 flex-row flex">
          <Copy />
          <Download />
        </CardAction>
      </CardFooter>
    </Card>
  );
}

function Copy() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        copyImage()
          .then(() => {
            toast('复制成功');
          })
          .catch(() => {
            toast('复制失败');
          })
          .finally(() => {
            setTimeout(() => {
              setLoading(false);
            }, 200);
          });
      }}
    >
      <Loader2Icon
        className="animate-spin"
        size={16}
        style={{ display: loading ? 'inline-block' : 'none' }}
      />
      复制
    </Button>
  );
}

function Download() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        downloadImage()
          .then(() => {
            toast('下载成功');
          })
          .catch(() => {
            toast('下载失败');
          })
          .finally(() => {
            setTimeout(() => {
              setLoading(false);
            }, 200);
          });
      }}
    >
      <Loader2Icon
        className="animate-spin"
        size={16}
        style={{ display: loading ? 'inline-block' : 'none' }}
      />
      下载
    </Button>
  );
}
