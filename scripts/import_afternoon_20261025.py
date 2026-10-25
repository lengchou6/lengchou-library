"""Import sixteen books from thirty-two full-frame photographs."""
import json,hashlib,shutil,argparse
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);args=p.parse_args();root=Path(__file__).resolve().parents[1];path=root/'dist/data/books.json';d=json.loads(path.read_text());assert len(d['books'])==55
# title, subtitle, author, country, translators, publisher, ISBN, price, front, back, category
rows=[
('北欧神话ABC',None,'茅盾',None,[],'江苏凤凰文艺出版社','978-7-5594-4537-7',48,'132149','132201','人文与社科'),
('心流','最优体验心理学','米哈里·契克森米哈赖','美国',['张定绮'],'中信出版集团','978-7-5086-7553-4',49,'132224','132236','人文与社科'),
('我的阿勒泰',None,'李娟',None,[],'花城出版社','978-7-5360-9435-2',45,'132322','132337','文学与小说'),
('以日为鉴','衰退时代生存指南','分析师Boden',None,[],'开明出版社','978-7-5131-9609-3',58,'133231','133245','人文与社科'),
('十八岁出门远行',None,'余华',None,[],'江苏凤凰文艺出版社','978-7-5594-8455-0',45,'133323','133332','文学与小说'),
('中华人民共和国刑法',None,None,None,[],'中国法制出版社','978-7-5216-1553-1',30,'133426','133435','人文与社科'),
('我们生活在巨大的差距里',None,'余华',None,[],'北京十月文艺出版社','978-7-5302-1465-7',35,'133515','133526','文学与小说'),
('日本游戏制作理念初探',None,'陶学',None,[],'黄山书社','978-7-5461-2752-1',26,'133543','133555','游戏与设计'),
('游戏设计信条','从创意到制作的设计原则','Marc Albinet','法国',['路遥'],'人民邮电出版社','978-7-115-48021-7',49,'133627','133641','游戏与设计'),
('游戏情感设计','如何触动玩家的心灵','Katherine Isbister','美国',['金潮'],'电子工业出版社','978-7-121-30847-5',65,'133721','133741','游戏与设计'),
('情节！情节！','通过人物、悬念与冲突赋予故事生命力','诺亚·卢克曼',None,['唐奇','李永强'],'中国人民大学出版社','978-7-300-15962-1',36,'133803','133811','写作与叙事'),
('游戏设计的236个技巧','游戏机制、关卡设计和镜头窍门','大野功二','日本',['支鹏浩'],'人民邮电出版社','978-7-115-40608-8',129.8,'133916','133933','游戏与设计'),
('救猫咪','电影编剧指南','布莱克·斯奈德','美国',['孟彪'],'浙江文艺出版社','978-7-5339-6336-1',49.8,'133954','134015','写作与叙事'),
('救猫咪2','经典电影剧本解析','布莱克·斯奈德','美国',['谢楚聿'],'浙江文艺出版社','978-7-5339-6410-8',59.8,'134035','134045','写作与叙事'),
('救猫咪3','反击战','布莱克·斯奈德','美国',['孟彪'],'浙江文艺出版社','978-7-5339-7595-1',49.8,'134058','134106','写作与叙事'),
('阿兹特克文明',None,'乔治·C.瓦伦特','美国',['朱伦','徐世澄'],'译林出版社','978-7-5447-3715-9',28.8,'134130','134137','人文与社科')]
paths=[]
for i,(title,sub,author,country,trans,publisher,isbn,price,front,back,category) in enumerate(rows,56):
 ident=f'LC-{i:06}';photos=[]
 for stamp,side,label in [(front,'front','正面'),(back,'back','背面')]:
  src=args.source/f'IMG_20261025_{stamp}.jpg';dest=root/f'dist/assets/{ident}/{side}-original.jpg';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest);w,h=Image.open(src).size;rel=dest.relative_to(root/'dist').as_posix();paths.append(dest.relative_to(root).as_posix())
  photos.append(dict(side=side,label=label,file=rel,original=rel,sourceFilename=src.name,capturedAt=f'2026-10-25T{stamp[:2]}:{stamp[2:4]}:{stamp[4:]}+08:00',timePrecision='second',timeSource='文件名精确至秒，照片水印核对至分钟；无可读取 EXIF 时间',sha256=hashlib.sha256(src.read_bytes()).hexdigest(),width=w,height=h))
 tags=[category];usage={'游戏与设计':['游戏设计参考'],'写作与叙事':['写作参考','叙事结构'],'文学与小说':['文学阅读'],'人文与社科':['资料参考']}[category]
 note='书目信息据实体正反面照片；出版版次和印次未从本批照片确认。'
 condition='封面、封底与边角可见轻微使用痕迹；未检查内页和装订。'
 if i==57:condition='封面、封底边角可见明显掉色、磨损和磕碰。'
 if i==59:condition='封面右上角可见折痕，边缘有轻微磨损。'
 b=dict(id=ident,title=title,subtitle=sub,authors=[] if author is None else [dict(name=author,country=country,role='著')],translators=trans,publisher=publisher,isbn=isbn,category=category,tags=tags,usageTags=usage,language='zh-Hans',languageLabel='中文',series=None,seriesGroupId=None,seriesNumber=None,seriesLabel=None,purchaseGroupId=None,orientation='portrait',publicationDate=None,edition=None,listPrice=price,paidPrice=None,currency='CNY',purchaseDate=None,purchaseChannel=None,accessionedAt=photos[0]['capturedAt'],readingStatus=None,location=None,notes=note,description=None,metadataSource='用户上传的实体书封面和封底照片',photos=photos,condition=dict(label='有明显磨损' if i==57 else '有使用痕迹',note=condition,scope='外观',source='照片预估',assessedOn='2026-10-25'))
 if i==61:b['coverEditionLabel']='全新修订版·实用版；根据刑法修正案十一修订（封面标识）'
 if i==66:b['series']='创意写作书系'
 if 68<=i<=70:b.update(series='救猫咪',seriesGroupId='save-the-cat',seriesNumber=i-67,seriesLabel=f'第{i-67}册')
 if i==71:b.update(series='汉译经典',seriesLabel='067')
 d['books'].append(b)
d['seriesGroups'].append(dict(id='save-the-cat',title='救猫咪系列',shortTitle='救猫咪',kind='三册书系',description='按封面序号1—3排列，三册独立ISBN和定价；不推定属于同一购买套装。'))
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');Path('/workspace/scratch/d7434e3573fb/batch25cd-paths.json').write_text(json.dumps(paths));print('Imported 16 books and 32 photos')
