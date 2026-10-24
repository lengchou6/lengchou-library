"""Import seven physical Dune volumes and two shared packaging photographs."""
import json,hashlib,shutil,argparse
from pathlib import Path
from PIL import Image
parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);args=parser.parse_args()
R=Path(__file__).resolve().parents[1];src=args.source;p=R/'dist/data/books.json';d=json.loads(p.read_text())
assert len(d['books'])==32
rows=[
('沙丘',None,'Dune',['顾备'],'978-7-5594-7820-7',79.9,'C258C5DC913679D8A5BB62C850D3059E','F1765230898F3645AE7B894C6F557680','15:39','15:39'),
('沙丘2','沙丘救世主','Dune Messiah',['苏益群'],'978-7-5594-7819-1',49.9,'E697D31C7E55D59EFF83754F9914E0C6','D5383339D40C15704E3F38D631018FF8','15:40','15:40'),
('沙丘3','沙丘之子','Children of Dune',['张建光'],'978-7-5594-7818-4',69.9,'350E66D5B6CA92386363C5F68F7C73E4','26EB403861E78A6E3C140A41B93ACB32','15:40','15:40'),
('沙丘4','沙丘神帝','God Emperor of Dune',['刘未央'],'978-7-5594-7817-7',69.9,'7AF855BD15C99027435F895D197D7C8E','99955346B8A19A0546DCDF0FA2F8CF42','15:40','15:40'),
('沙丘5','沙丘异端','Heretics of Dune',['魏晋'],'978-7-5594-7821-4',79.9,'A2711A75C2DD9529F819E11477789E07','EFA87EA34E70C1D52F1862170300F1A0','15:41','15:41'),
('沙丘6','圣殿沙丘','Chapterhouse: Dune',['老光','甄春雨'],'978-7-5594-7816-0',75,'0AD85C932CD3E4FB434564B1B2354802','1F13F08F7D77900610A144E200865B91','15:41','15:41'),
('沙丘档案',None,None,[],None,None,'6DDAA4805A777F45F15C70109EC40656','016ED6F8151C82A6499ED05DF468E37E','15:39','15:39')]
newpaths=[]
def photo(stem,folder,side,label,time):
 path=R/'dist/assets'/folder/(side+'-original.jpg');path.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src/(stem+'.jpg'),path);raw=path.read_bytes();w,h=Image.open(path).size;rel=path.relative_to(R/'dist').as_posix();newpaths.append(path.relative_to(R).as_posix())
 return {'side':side,'label':label,'file':rel,'original':rel,'sourceFilename':stem+'.jpg','capturedAt':'2026-10-24T'+time+'+08:00','timePrecision':'minute','timeSource':'照片水印，仅精确至分钟；文件名不含拍摄时间，EXIF 无可读取时间','sha256':hashlib.sha256(raw).hexdigest(),'width':w,'height':h}
gid='dune-duke-2024'
group={'id':gid,'title':'沙丘 · 读客版','shortTitle':'沙丘（读客版）','kind':'六部曲与附册','description':'六部曲依第 1—6 部排列，《沙丘档案》作为附册独立编目。套盒外封及书脊合照为系列补充照片，不计册数或价格。','photos':[photo('8DDCD29B7B29EBE5B18340864DCBE153',gid,'box-front','套盒外封','15:43'),photo('62A21B79CA61C049BDD2A36DA03F56AA',gid,'box-spines','六册书脊合照','15:43')]}
d['seriesGroups'].append(group)
for i,row in enumerate(rows,33):
 title,sub,original,trans,isbn,price,front,back,ft,bt=row;n=i-32;ident=f'LC-{i:06}';archive=n==7
 photos=[photo(front,ident,'front','正面',ft),photo(back,ident,'back','背面',bt)]
 d['books'].append({'id':ident,'title':title,'subtitle':sub,'originalTitle':original,'authors':[{'name':'弗兰克·赫伯特','country':'美国','originalName':'Frank Herbert','role':'著'}],'translators':trans,'publisher':None if archive else '江苏凤凰文艺出版社','imprint':'读客','isbn':isbn,'category':'文学与小说','tags':['沙丘','科幻小说','读客']+(['附册'] if archive else ['2024增补修订版']),'usageTags':['世界观参考','角色塑造','叙事结构'],'language':'zh-Hans','languageLabel':'中文译本','series':group['title'],'seriesGroupId':gid,'seriesNumber':n,'seriesLabel':'附册' if archive else f'第{n}部','physicalSetId':None if archive else 'dune-six-volume-box','purchaseGroupId':None,'orientation':'portrait','coverEditionLabel':None if archive else '2024年全新增补修订版（封底标识）','publicationDate':None,'edition':None,'listPrice':price,'paidPrice':None,'currency':'CNY','purchaseDate':None,'purchaseDatePrecision':None,'purchaseChannel':None,'accessionedAt':photos[0]['capturedAt'],'accessionRule':'正面照片水印时间，精确至分钟','readingStatus':None,'location':None,'notes':'照片未见独立 ISBN、定价和译者；附册出版责任及是否随套赠送待版权页核对。' if archive else '读客科幻文库；出版版次和印次待版权页核对。','description':'随本批读客版《沙丘》六部曲一并编目的附册；书内内容与出版信息待核对。' if archive else f'弗兰克·赫伯特《沙丘》六部曲第{n}部。按实体封面、封底记录书名、译者、ISBN 与定价。','metadataSource':'用户上传的实体书正反面照片与套盒照片；分类和用途为个人编目','photos':photos,'condition':{'label':'约八五成新','note':'封面及封底可见轻微擦痕、边角磨损；反光部分不作损伤判断。','scope':'外观','source':'正反面照片预估','assessedOn':'2026-10-24','limitations':'未检查内页、装订、缺页及笔记。'}})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');Path('/workspace/scratch/d7434e3573fb/dune-original-paths.json').write_text(json.dumps(newpaths));print('Imported 7 books and 16 original photographs')
