<script>
/* ============================================================
   LANGUAGE

   English is the source: every key below IS the English string,
   so a missing translation falls through to readable English
   rather than a blank or a key name.

   Trading vocabulary stays English on purpose — R-multiple,
   profit factor, expectancy, drawdown, MAE/MFE, setup names.
   That is what the material you will read next uses, and a
   Turkish coinage would only have to be un-learned later.

   Placeholders are {named}, so a translation can reorder them:
   Turkish puts the verb last and the English word order does not
   survive a literal swap.
   ============================================================ */
let LANG = 'en';

const TR = {
  /* ---- shell, tabs, top bar ---- */
  'Account': 'Hesap',
  'Export': 'Dışa aktar',
  'Import': 'İçe aktar',
  '+ New trade': '+ Yeni işlem',
  'Dashboard': 'Panel',
  'New Trade': 'Yeni İşlem',
  'Trade History': 'İşlem Geçmişi',
  'Analysis': 'Analiz',
  'Edge Lab': 'Edge Lab',
  'Discipline': 'Disiplin',
  'Risk & Sizing': 'Risk & Boyut',
  'Trade Review': 'İşlem İncelemesi',
  'Settings': 'Ayarlar',
  'Saved locally': 'Yerelde kayıtlı',
  'Not saved': 'Kaydedilmiyor',
  'Where your trades are stored': 'İşlemlerinin nerede saklandığı',
  'Trades live in this browser. Export a backup to move them to another machine.':
    'İşlemler bu tarayıcıda duruyor. Başka bir makineye taşımak için yedek al.',
  'This browser will not let a page opened straight from disk store anything. Serve the folder over http, or nothing survives a reload.':
    'Bu tarayıcı diskten açılan sayfanın veri kaydetmesine izin vermiyor. Klasörü http üzerinden sun, yoksa sayfayı yenilediğinde her şey gider.',
  'The last change could not be written to this browser': 'Son değişiklik bu tarayıcıya yazılamadı',
  'Sample data': 'Örnek veri',
  'These 26 trades are made up, so every chart has something to show. Clear them before you log your own.':
    'Bu 26 işlem uydurma — her grafikte görecek bir şey olsun diye. Kendi işlemlerini girmeden önce temizle.',
  'Clear samples': 'Örnekleri temizle',

  /* ---- shared ---- */
  'Overview': 'Genel bakış',
  'Detailed statistics': 'Detaylı istatistik',
  'Cancel': 'Vazgeç',
  'Confirm': 'Onayla',
  'Remove': 'Kaldır',
  'Edit': 'Düzenle',
  'Delete': 'Sil',
  'Review': 'İncele',
  'Clear': 'Temizle',
  'trades': 'işlem',
  'trade': 'işlem',
  'no trades': 'işlem yok',
  'never': 'hiç',
  'Loading…': 'Yükleniyor…',
  'Screenshot could not be read back': 'Ekran görüntüsü geri okunamadı',
  'Something went wrong drawing this view': 'Bu ekran çizilirken bir şey ters gitti',
  'Nothing to compare yet.': 'Karşılaştıracak bir şey yok.',
  'Nothing in this range yet.': 'Bu aralıkta bir şey yok.',
  'No trades to split yet.': 'Bölecek işlem yok.',
  'Not enough trades yet.': 'Yeterli işlem yok.',
  'Not enough closed trades to draw a curve yet.': 'Eğri çizmeye yetecek kadar kapanmış işlem yok.',
  'No trades in this account yet': 'Bu hesapta henüz işlem yok',
  'Log one on the {tab} tab and every chart here fills in.':
    '{tab} sekmesinden bir tane gir, buradaki tüm grafikler dolsun.',
  'Log your first trade': 'İlk işlemini gir',

  /* ---- dashboard: overview ---- */
  'Account equity': 'Hesap büyüklüğü',
  'Started at {v}': '{v} ile başladı',
  'Net P&L': 'Net kâr/zarar',
  '{v} return': '{v} getiri',
  'Win rate': 'Kazanma oranı',
  '{w}W · {l}L of {n}': '{n} işlemde {w} kazanç · {l} kayıp',
  'Expectancy': 'Expectancy',
  '{v} per trade': 'işlem başına {v}',
  'Profit factor': 'Profit factor',
  'Healthy': 'Sağlıklı',
  'Thin but positive': 'İnce ama pozitif',
  'Losing money': 'Para kaybediyor',
  'Equity curve': 'Hesap eğrisi',
  '{acc} account, trade by trade': '{acc} hesabı, işlem işlem',
  'Underwater': 'Zirveden uzaklık',
  'How far below the high-water mark the account sat after each trade — the deepest was {v} ({p})':
    'Her işlemden sonra hesabın gördüğü en yüksek seviyenin ne kadar altında kaldığı — en derini {v} ({p})',
  'By week': 'Haftalık',
  'By month': 'Aylık',
  'Week of {d}': '{d} haftası',
  'Road to {goal}': '{goal} yolu',
  'of goal': 'hedefin',
  'Trading capital': 'İşlem sermayesi',
  'Set aside': 'Kenara ayrılan',
  'Still to go': 'Kalan',
  'Process scorecard': 'Süreç karnesi',
  'What the account looks like when you follow your own rules':
    'Kendi kurallarına uyduğunda hesabın nasıl göründüğü',
  'Trades that broke no rule': 'Hiçbir kural çiğnemeyen işlemler',
  'P&L from those trades': 'O işlemlerin kâr/zararı',
  'P&L from the rest': 'Geri kalanın kâr/zararı',
  'Average execution grade': 'Ortalama uygulama notu',
  'Open discipline report': 'Disiplin raporunu aç',
  'Total return': 'Toplam getiri',
  'Max drawdown': 'Max drawdown',
  'Best trade': 'En iyi işlem',
  'Worst trade': 'En kötü işlem',
  'Active since': 'Başlangıç',
  'starting equity': 'başlangıç sermayesi',

  /* ---- dashboard: detailed ---- */
  'Average R': 'Ortalama R',
  'Winners {w} · losers {l}': 'Kazananlar {w} · kaybedenler {l}',
  '{n} trades': '{n} işlem',
  '{won} won vs {lost} lost': '{won} kazanç, {lost} kayıp',
  'Max drawdown {v}': 'Max drawdown {v}',
  'Daily P&L': 'Günlük kâr/zarar',
  'Last 14 days': 'Son 14 gün',
  'Trading calendar': 'İşlem takvimi',
  'Green days made money, red days lost it. The right column totals each week.':
    'Yeşil günler kazandırdı, kırmızı günler kaybettirdi. Sağdaki sütun haftalık toplam.',
  'Week': 'Hafta',
  'Month total': 'Ay toplamı',
  'What the record says': 'Kayıtlar ne diyor',
  'Only groups with at least 3 trades — anything smaller is noise':
    'Sadece en az 3 işlemi olan gruplar — daha azı gürültü',
  'A few more trades and patterns start showing up here.':
    'Birkaç işlem daha, burada desenler belirmeye başlar.',
  'Setup mix': 'Setup dağılımı',
  'Wins and losses': 'Kazançlar ve kayıplar',
  'Largest win': 'En büyük kazanç',
  'Average win': 'Ortalama kazanç',
  'Largest loss': 'En büyük kayıp',
  'Average loss': 'Ortalama kayıp',
  'Win / loss size': 'Kazanç / kayıp oranı',
  'Streaks': 'Seriler',
  'Longest winning run': 'En uzun kazanç serisi',
  'Longest losing run': 'En uzun kayıp serisi',
  'Right now': 'Şu an',
  '{n} wins in a row': 'üst üste {n} kazanç',
  '{n} losses in a row': 'üst üste {n} kayıp',
  'Plan adherence': 'Plana uyum',
  'How often each rule survived contact with the market':
    'Her kuralın piyasayla temasta ne sıklıkla ayakta kaldığı',

  /* ---- insights ---- */
  'Best weekday: {d}': 'En iyi gün: {d}',
  '{n} trades, {w} win rate, {r} average.': '{n} işlem, {w} kazanma oranı, ortalama {r}.',
  'Worst weekday: {d}': 'En kötü gün: {d}',
  '{n} trades at {w}. Worth sizing down here, or sitting out.':
    '{w} oranla {n} işlem. Burada boyutu küçültmek, ya da hiç girmemek mantıklı.',
  'Strongest setup: {s}': 'En güçlü setup: {s}',
  '{n} trades, {w} win rate, {p} total.': '{n} işlem, {w} kazanma oranı, toplam {p}.',
  '{s} is bleeding': '{s} kan kaybediyor',
  'Setup drag': 'Setup yükü',
  '{n} trades at {w}. Either it needs a filter or it needs dropping.':
    '{w} oranla {n} işlem. Ya bir filtre gerekiyor ya da bu setup elenmeli.',
  '{d}s carry the account': 'Hesabı {d} işlemler taşıyor',
  '{a}: {ar} over {an}. {b}: {br} over {bn}.': '{a}: {an} işlemde {ar}. {b}: {bn} işlemde {br}.',
  'Best session: {s}': 'En iyi seans: {s}',
  '{n} trades, {w} win rate.': '{n} işlem, {w} kazanma oranı.',
  'Expectancy per trade': 'İşlem başına expectancy',
  'Risking {risk} a trade, the average trade returns {v}. Over 100 trades that is {total}.':
    'İşlem başına {risk} riske girerek ortalama {v} kazanıyorsun. 100 işlemde bu {total} eder.',
  'Longest losing run: {n}': 'En uzun kayıp serisi: {n}',
  '{n} in a row': 'üst üste {n}',
  'At {w} loss rate a run this long is normal. Size so it stays survivable.':
    '{w} kayıp oranında bu uzunlukta bir seri normaldir. Boyutunu, buna dayanacak şekilde ayarla.',

  /* ---- trade form ---- */
  'Log a trade': 'İşlem gir',
  'Edit trade': 'İşlemi düzenle',
  'Price and risk first; the notes live on the Trade Review tab.':
    'Önce fiyat ve risk; notlar İşlem İncelemesi sekmesinde.',
  'Cancel edit': 'Düzenlemeyi bırak',
  'The trade': 'İşlem',
  'Symbol': 'Sembol',
  'Market': 'Piyasa',
  'Direction': 'Yön',
  'Long': 'Long',
  'Short': 'Short',
  'Entered': 'Giriş zamanı',
  'Closed': 'Çıkış zamanı',
  'Prices and size': 'Fiyatlar ve boyut',
  'Entry price': 'Giriş fiyatı',
  'Stop loss': 'Stop loss',
  'Take profit': 'Take profit',
  'Exit price': 'Çıkış fiyatı',
  'Size': 'Boyut',
  'lots / shares / coins': 'lot / adet / coin',
  'lots': 'lot', 'shares': 'adet', 'coins': 'coin', 'contracts': 'kontrat',
  'Forex': 'Forex', 'Gold / metals': 'Altın / metaller', 'Index': 'Endeks',
  'Stocks': 'Hisse', 'Crypto': 'Kripto', 'Commodity': 'Emtia',
  'Risked': 'Riske girilen',
  'The cash you accepted losing.': 'Kaybetmeyi göze aldığın para.',
  'fill from stop': 'stop\'tan hesapla',
  'Result': 'Sonuç',
  'Net cash.': 'Net tutar.',
  'fill from exit': 'çıkıştan hesapla',
  'Setup': 'Setup',
  'Tags': 'Etiketler',
  'Comma separated': 'Virgülle ayır',
  'How far it ran': 'Ne kadar gitti',
  'Worst point against you (R)': 'Aleyhine en kötü nokta (R)',
  '1.0 means it reached your stop': '1.0 stop\'una değdi demek',
  'Best point in your favour (R)': 'Lehine en iyi nokta (R)',
  '3.0 means it offered 3× your risk': '3.0 riskinin 3 katını sundu demek',
  'Execution grade': 'Uygulama notu',
  'Was it your trade to take?': 'Bu işlem senin işlemin miydi?',
  'It was in the plan before the session': 'Seans öncesi planımdaydı',
  'Entry as planned': 'Giriş planlandığı gibi',
  'Stop where it belonged': 'Stop olması gereken yerde',
  'Target as planned': 'Hedef planlandığı gibi',
  'Size within the rules': 'Boyut kurallara uygun',
  'No rule broken': 'Hiçbir kural çiğnenmedi',
  'Market read': 'Piyasa okuması',
  'Bullish': 'Yükseliş',
  'Bearish': 'Düşüş',
  'Neutral': 'Nötr',
  'How you felt': 'Nasıl hissettin',
  'Save changes': 'Değişiklikleri kaydet',
  'Log trade': 'İşlemi kaydet',
  'This trade is {r} — {pnl} on {risk} risked.': 'Bu işlem {r} — {risk} riske {pnl} kazanç.',
  'Enter what you risked to see the R-multiple.': 'R-multiple için riske girdiğin tutarı yaz.',
  'In {unit} · 1 {one} = {mult} units': '{unit} cinsinden · 1 {one} = {mult} birim',
  'Needs entry, stop and size first': 'Önce giriş, stop ve boyut gerekiyor',
  'Needs entry, exit and size first': 'Önce giriş, çıkış ve boyut gerekiyor',
  'scrappy': 'derme çatma', 'sloppy': 'özensiz', 'acceptable': 'kabul edilebilir',
  'clean': 'temiz', 'textbook': 'ders kitabı gibi',

  /* ---- history ---- */
  'Search symbol, setup, tag': 'Sembol, setup, etiket ara',
  'Any market': 'Tüm piyasalar',
  'Any direction': 'Tüm yönler',
  'Any setup': 'Tüm setuplar',
  'Any result': 'Tüm sonuçlar',
  'Winners': 'Kazananlar',
  'Losers': 'Kaybedenler',
  'From': 'Başlangıç',
  'To': 'Bitiş',
  '{shown} of {total}': '{total} işlemden {shown} tanesi',
  'Nothing matches those filters': 'Bu filtrelere uyan bir şey yok',
  'Loosen one and try again.': 'Birini gevşetip tekrar dene.',
  'Date': 'Tarih',
  'Entry': 'Giriş',
  'Exit': 'Çıkış',
  'Rules': 'Kurallar',
  'Win': 'Kazanç',
  'Loss': 'Kayıp',
  'Flat': 'Başabaş',
  'clean record': 'temiz',

  /* ---- analysis ---- */
  'What is actually working': 'Gerçekten ne işe yarıyor',
  'Ranked by money, not by feel. Groups under three trades are still noise — read them lightly.':
    'His değil, para sıralaması. Üç işlemin altındaki gruplar hâlâ gürültü — hafif oku.',
  'Trades': 'İşlem',
  'Avg R': 'Ort. R',
  'Long vs short': 'Long ve short',
  'Two numbers side by side beat a two-slice pie': 'Yan yana iki sayı, iki dilimli pastadan iyidir',
  '{w} win rate · {r} avg': '{w} kazanma oranı · ortalama {r}',
  'By weekday': 'Gün bazında',
  'By market': 'Piyasa bazında',
  'By symbol': 'Sembol bazında',
  'Top 10 by result': 'Sonuca göre ilk 10',
  'Risk metrics': 'Risk metrikleri',
  'The shape of the account, independent of how many trades you took.':
    'Kaç işlem yaptığından bağımsız olarak hesabın şekli.',
  'vs {v} average loss': 'ortalama {v} kayba karşı',
  'Higher means winners outweigh losers': 'Yüksek olması kazançların kayıpları bastırdığını gösterir',
  'Gross won ÷ gross lost': 'Brüt kazanç ÷ brüt kayıp',
  '{p} from the high': 'zirveden {p}',
  'Average return per trade, in units of risk': 'İşlem başına ortalama getiri, risk birimiyle',
  'Consistency': 'Tutarlılık',
  'Average R ÷ spread of R. Above 0.3 is steady': 'Ortalama R ÷ R\'nin dağılımı. 0.3 üstü istikrarlı',
  'System quality': 'Sistem kalitesi',
  'Strong for this sample': 'Bu örneklem için güçlü',
  'Decent': 'İdare eder',
  'Too early to tell': 'Söylemek için erken',
  'Size so this stays survivable': 'Buna dayanacak boyutta çalış',

  /* ---- edge lab ---- */
  'Edge Lab needs a handful of trades': 'Edge Lab için birkaç işlem gerekiyor',
  'Four questions the trade list can answer: what does a typical trade look like, where does this edge lead, when do you trade well, and how much of each move do you keep?':
    'İşlem listesinin cevaplayabildiği dört soru: tipik bir işlem neye benziyor, bu edge nereye gider, ne zaman iyi işlem yapıyorsun, ve her hareketin ne kadarını cebe koyuyorsun?',
  'R-multiple distribution': 'R-multiple dağılımı',
  'Every trade sorted by what it returned relative to what it risked':
    'Her işlem, riskine göre ne getirdiğine bakılarak sıralanmış',
  'The average trade': 'Ortalama işlem',
  'Over 100 trades': '100 işlemde',
  'at your current average risk': 'şu anki ortalama riskinle',
  '{n} trades, {p} of the book': '{n} işlem, defterin {p} kadarı',
  'Positive expectancy': 'Pozitif expectancy',
  'Negative expectancy': 'Negatif expectancy',
  'Each trade is worth {r} on average. The job now is repeating it enough times and not blowing up in the meantime.':
    'Her işlem ortalamada {r} değerinde. Şimdiki iş bunu yeterince tekrarlamak ve bu arada patlamamak.',
  'On this sample each trade costs you {r}. Either the setup needs a filter or the exits need work — size down until it turns.':
    'Bu örneklemde her işlem sana {r} kaybettiriyor. Ya setup bir filtre istiyor ya da çıkışlar — dönene kadar boyutu küçült.',
  'Where this edge leads': 'Bu edge nereye gider',
  'Your {n} results, drawn at random {p} times over. Past results, reshuffled — not a forecast.':
    'Senin {n} sonucun, {p} kez rastgele çekildi. Geçmişin karıştırılmış hali — tahmin değil.',
  'Risk per trade': 'İşlem başına risk',
  'Trades ahead': 'İleriye kaç işlem',
  'Call it ruin at': 'Ruin sayılacak düşüş',
  'Run 1,500 paths': '1.500 senaryo çalıştır',
  'Running…': 'Çalışıyor…',
  'Run the simulation': 'Simülasyonu çalıştır',
  'It reshuffles your own {n} results thousands of times to show the range of accounts the same edge can produce.':
    'Senin {n} sonucunu binlerce kez karıştırıp aynı edge\'in üretebileceği hesap aralığını gösterir.',
  'Median outcome': 'Ortanca sonuç',
  'after {n} trades': '{n} işlem sonra',
  'Bad run (5th pct)': 'Kötü senaryo (5. yüzdelik)',
  '1 run in 20 ends here or worse': '20 senaryodan 1\'i burada ya da daha kötü biter',
  'Good run (95th pct)': 'İyi senaryo (95. yüzdelik)',
  '1 run in 20 ends here or better': '20 senaryodan 1\'i burada ya da daha iyi biter',
  'Chance of a {p} drawdown': '{p} drawdown olasılığı',
  'Somewhere along the way': 'Yol boyunca herhangi bir noktada',
  'Chance of finishing down': 'Zararla bitirme olasılığı',
  'Below where you started': 'Başladığın yerin altında',
  'Typical worst drawdown': 'Tipik en kötü drawdown',
  '1 run in 20 sees {p} or deeper': '20 senaryodan 1\'i {p} ya da daha derinini görür',
  'Trade {n} — median {m} · 90% band {lo} to {hi}':
    '{n}. işlem — ortanca {m} · %90 bandı {lo} – {hi}',
  'By session': 'Seans bazında',
  'Top: money. Bottom: win rate. Sessions use your own clock.':
    'Üst: para. Alt: kazanma oranı. Seanslar kendi saatine göre.',
  'By entry hour': 'Giriş saati bazında',
  'Asia': 'Asya', 'London': 'Londra', 'LDN/NY overlap': 'LDN/NY kesişimi',
  'New York': 'New York', 'Late / thin': 'Geç / sığ',
  'How much of the move you keep': 'Hareketin ne kadarını tutuyorsun',
  'Each dot is a trade: how far it ran in your favour, against what you took home':
    'Her nokta bir işlem: lehine ne kadar gitti, sen ne kadarını aldın',
  'Fill in MAE and MFE to unlock this': 'Bunu açmak için MAE ve MFE gir',
  'On each trade, note how far price went against you and how far it went your way, both measured in R. {covered} of {total} trades have it so far.':
    'Her işlemde fiyatın aleyhine ve lehine ne kadar gittiğini R cinsinden yaz. Şu ana kadar {total} işlemin {covered} tanesinde var.',
  'Log MFE on a few trades and this fills in.': 'Birkaç işleme MFE gir, burası dolsun.',
  'kept the whole move': 'hareketin tamamını aldı',
  'best unrealised move (MFE, in R)': 'lehine en iyi nokta (MFE, R cinsinden)',
  '{sym} {d} · offered {x}R · kept {y}': '{sym} {d} · sundu {x}R · alınan {y}',
  'Heat on winners': 'Kazananlarda ısı',
  'Your winners went this far against you first': 'Kazanan işlemlerin önce bu kadar aleyhine gitti',
  'Left on the table': 'Masada bırakılan',
  'Average best point of the trades that lost': 'Kaybeden işlemlerin ortalama en iyi noktası',
  'Capture rate': 'Yakalama oranı',
  'Share of the favourable move you actually kept': 'Lehine hareketin gerçekten aldığın kısmı',
  'Winners turned losers': 'Kazançtan kayba dönenler',
  'Gave back {r}R in total': 'Toplam {r}R geri verildi',
  'None — good discipline': 'Yok — disiplin iyi',
  'Where your stop could sit': 'Stop\'un nerede durabilir',
  'Your winners never needed more than {max}R of room, and typically used {avg}R. A stop much wider than that is paying for space the winners never use — but check the sample is big enough before moving it.':
    'Kazanan işlemlerin hiçbir zaman {max}R\'den fazla alana ihtiyaç duymadı, tipik olarak {avg}R kullandı. Bundan çok daha geniş bir stop, kazananların hiç kullanmadığı alanın parasını ödüyor — ama taşımadan önce örneklemin yeterli olduğundan emin ol.',
  '{max}R max': 'en fazla {max}R',

  /* ---- discipline ---- */
  'A trade is flagged when it broke one of your own rules: unplanned, taken straight after a loss, past the daily cap, past the loss limit, or wrong size.':
    'Bir işlem, kendi kurallarından birini çiğnediğinde işaretlenir: plansız, kayıptan hemen sonra, günlük işlem sınırının üstünde, günlük kayıp limitinin ötesinde, ya da yanlış boyutta.',
  'Clean trades': 'Temiz işlemler',
  '{clean} of {total} broke no rule': '{total} işlemin {clean} tanesi hiçbir kural çiğnemedi',
  'Clean P&L': 'Temiz kâr/zarar',
  'Flagged P&L': 'İşaretli kâr/zarar',
  '{w} win rate': '{w} kazanma oranı',
  'nothing flagged': 'işaretli işlem yok',
  'Removing them would': 'Onları çıkarmak',
  'change the account by this much': 'hesabı bu kadar değiştirirdi',
  'The same account without the flagged trades': 'İşaretli işlemler olmadan aynı hesap',
  'Same trades, same order — the flagged ones simply removed':
    'Aynı işlemler, aynı sıra — işaretliler sadece çıkarıldı',
  'Not enough clean trades to draw a second curve yet.': 'İkinci eğriyi çizecek kadar temiz işlem yok.',
  'Rules kept only': 'Sadece kurallara uyulanlar',
  'What actually happened': 'Gerçekte olan',
  '{n} trades, {w} win rate': '{n} işlem, {w} kazanma oranı',
  'Breaking the rules cost you {v}': 'Kuralları çiğnemek sana {v} kaybettirdi',
  'The flagged trades were not the problem': 'Sorun işaretli işlemler değildi',
  'Following your own rules on every trade would have left the account at {clean} instead of {all}. That gap is free money, and it needs no new edge.':
    'Her işlemde kendi kurallarına uysaydın hesap {all} yerine {clean} olurdu. Bu fark bedava para ve yeni bir edge gerektirmiyor.',
  'On this sample the flagged trades did not drag the account down. Keep watching — this usually flips as the sample grows.':
    'Bu örneklemde işaretli işlemler hesabı aşağı çekmemiş. İzlemeye devam et — örneklem büyüdükçe bu genelde tersine döner.',
  'What the flags cost': 'İşaretler neye mal oldu',
  'Total P&L of the trades carrying each flag': 'Her işareti taşıyan işlemlerin toplam kâr/zararı',
  'No flags on record. That is the goal.': 'Kayıtta işaret yok. Hedef bu zaten.',
  'Today': 'Bugün',
  'Trades today': 'Bugünkü işlemler',
  'At the cap — stop here': 'Sınırdasın — burada dur',
  'Room for {n} more': '{n} işlem daha var',
  'R today': 'Bugünkü R',
  'Loss limit hit — done for the day': 'Kayıp limiti doldu — bugünlük bu kadar',
  'Limit is {r}': 'Limit {r}',
  'Change these limits on the Settings tab. They are the rules everything on this page is scored against.':
    'Bu limitleri Ayarlar sekmesinden değiştir. Bu sayfadaki her şey onlara göre puanlanıyor.',
  'Execution grade vs result': 'Uygulama notu ve sonuç',
  'Average R by the grade you gave yourself': 'Kendine verdiğin nota göre ortalama R',
  'Grade a few trades first.': 'Önce birkaç işleme not ver.',
  'How you felt vs result': 'Nasıl hissettiğin ve sonuç',
  'Average R by mood at entry': 'Girişteki ruh haline göre ortalama R',
  'No emotional state logged yet.': 'Henüz ruh hali kaydedilmemiş.',
  'Rule-by-rule': 'Kural kural',
  'How often each rule held': 'Her kuralın ne sıklıkla tuttuğu',
  'Grade {n}': '{n}. not',
  'calm': 'sakin', 'confident': 'kendine güvenen', 'excited': 'heyecanlı',
  'fearful': 'korkulu', 'uncertain': 'kararsız',
  'Not in the plan': 'Planda yoktu',
  'Rule broken': 'Kural çiğnendi',
  'Size off': 'Boyut yanlış',
  'Straight after a loss': 'Kayıptan hemen sonra',
  'Past the daily trade cap': 'Günlük işlem sınırının üstünde',
  'Past the daily loss limit': 'Günlük kayıp limitinin ötesinde',

  /* ---- risk & sizing ---- */
  'Risk & sizing': 'Risk ve boyutlandırma',
  'Size the trade before you take it. Enter where you get in and where you are wrong; the rest follows.':
    'İşleme girmeden önce boyutunu belirle. Nereden gireceğini ve nerede yanıldığını yaz, gerisi kendiliğinden gelir.',
  'Position size calculator': 'Pozisyon boyutu hesaplayıcı',
  'Account balance': 'Hesap bakiyesi',
  'Risk per trade (%)': 'İşlem başına risk (%)',
  'Most traders stay at or below 1%': 'Çoğu trader %1 ve altında kalır',
  'Sets the contract size ({mult} per {one})': 'Kontrat büyüklüğünü belirler ({one} başına {mult})',
  'Optional — adds the reward:risk': 'İsteğe bağlı — reward:risk oranını ekler',
  'Fill in entry and stop': 'Giriş ve stop gir',
  'They have to differ — the gap between them is what sets the size.':
    'Farklı olmaları gerekiyor — aradaki mesafe boyutu belirleyen şey.',
  'Position size': 'Pozisyon boyutu',
  'Rounded to what your broker accepts': 'Aracı kurumunun kabul ettiği hassasiyete yuvarla',
  'Cash at risk': 'Riskteki para',
  '{p} of {v}': '{v} tutarın {p} kadarı',
  'Stop distance': 'Stop mesafesi',
  'points of price': 'fiyat puanı',
  'Reward : risk': 'Reward : risk',
  'Worth taking': 'Girmeye değer',
  'Thin — needs a high win rate': 'İnce — yüksek kazanma oranı ister',
  'If target hits': 'Hedef tutarsa',
  'against {v} risked': '{v} riske karşılık',
  'Notional exposure ≈ {v}. One {one} of {market} moves {mult} per full point.':
    'Nominal büyüklük ≈ {v}. Bir {one} {market}, tam puan başına {mult} hareket eder.',
  'What your own record suggests': 'Kendi kayıtların ne diyor',
  'Kelly sizing, from your win rate and payoff': 'Kazanma oranın ve ödeme oranından Kelly boyutu',
  'Full Kelly (never use this)': 'Tam Kelly (asla kullanma)',
  'Half Kelly': 'Yarım Kelly',
  'Quarter Kelly': 'Çeyrek Kelly',
  'You are risking': 'Senin riskin',
  'You are sized above half Kelly': 'Yarım Kelly\'nin üstünde boyuttasın',
  'Your sizing is conservative': 'Boyutlandırman temkinli',
  'Kelly is the bet size that grows an account fastest given a win rate of {w} and winners {b}× the size of losers. It is also violently swingy, so traders use a quarter of it. On {n} trades this is an estimate, not a target.':
    'Kelly, {w} kazanma oranı ve kayıpların {b} katı kazançlar verildiğinde hesabı en hızlı büyüten bahis boyutudur. Aynı zamanda çok sert savrulur, o yüzden trader\'lar çeyreğini kullanır. {n} işlem üzerinden bu bir tahmin, hedef değil.',
  'Needs about 20 trades': 'Yaklaşık 20 işlem gerekiyor',
  'Sizing maths built on {n} trades would be guessing. Keep logging.':
    '{n} işlem üzerine kurulu boyut hesabı tahminden ibaret olur. Kaydetmeye devam.',
  'Your rules': 'Kuralların',
  'Daily loss limit': 'Günlük kayıp limiti',
  'Max trades a day': 'Günlük max işlem',
  'Cooldown after a loss': 'Kayıptan sonra bekleme',
  'Edit rules': 'Kuralları düzenle',
  'Worst case, at this size': 'Bu boyutta en kötü durum',
  'Longest losing run so far': 'Şimdiye kadarki en uzun kayıp serisi',
  '{n} trades': '{n} işlem',
  'That run at {p}': '{p} riskle o seri',
  'Deepest drawdown so far': 'Şimdiye kadarki en derin drawdown',

  /* ---- trade review ---- */
  'Reviewing': 'İncelenen',
  'Edit the numbers': 'Sayıları düzenle',
  'Stop': 'Stop',
  'P&L': 'Kâr/zarar',
  'R-multiple': 'R-multiple',
  'on {v} size': '{v} boyutla',
  'offered {v}R': 'sunduğu {v}R',
  'Risked {v}': 'Riske girilen {v}',
  'Charts': 'Grafikler',
  'Mark them up in your charting tool, then drop them in':
    'Grafik programında işaretle, sonra buraya sürükle',
  'Before the entry': 'Girişten önce',
  'After the exit': 'Çıkıştan sonra',
  'Add screenshot': 'Ekran görüntüsü ekle',
  'Read and result': 'Okuma ve sonuç',
  'Mood at entry': 'Girişteki ruh hali',
  'Worst point against': 'Aleyhine en kötü nokta',
  'Best point in favour': 'Lehine en iyi nokta',
  'Rules kept': 'Uyulan kurallar',
  'Before the trade': 'İşlemden önce',
  'What you saw in the market': 'Piyasada ne gördün',
  'The plan you wrote': 'Yazdığın plan',
  'Levels and setup detail': 'Seviyeler ve setup detayı',
  'After the trade': 'İşlemden sonra',
  'How closely you followed it': 'Plana ne kadar uydun',
  'What was going through your head': 'Aklından neler geçiyordu',
  'The one thing to carry forward': 'İleriye taşınacak tek şey',
  'Save review': 'İncelemeyi kaydet',
  'Saved just now': 'Az önce kaydedildi',

  /* ---- settings ---- */
  'Accounts, the rules your trades are scored against, and your data.':
    'Hesaplar, işlemlerinin puanlandığı kurallar ve verilerin.',
  'Accounts': 'Hesaplar',
  'Name': 'İsim',
  'Starting balance': 'Başlangıç bakiyesi',
  'Goal': 'Hedef',
  'Add account': 'Hesap ekle',
  'Every trade belongs to one account; the dashboard shows one at a time.':
    'Her işlem bir hesaba ait; panel aynı anda bir hesabı gösterir.',
  'New account': 'Yeni hesap',
  'Trading rules': 'İşlem kuralları',
  'Changing these re-scores every trade on the Discipline tab':
    'Bunları değiştirmek Disiplin sekmesindeki tüm işlemleri yeniden puanlar',
  'Daily loss limit (R)': 'Günlük kayıp limiti (R)',
  'Trades taken after this is hit get flagged': 'Bu dolduktan sonraki işlemler işaretlenir',
  'Cooldown after a loss (minutes)': 'Kayıptan sonra bekleme (dakika)',
  'Entering inside this window flags the trade': 'Bu süre içinde girmek işlemi işaretler',
  'Your setups': 'Setupların',
  'Comma separated — these fill the dropdown on the trade form':
    'Virgülle ayır — işlem formundaki listeyi bunlar doldurur',
  'Language': 'Dil',
  'Interface language': 'Arayüz dili',
  'Trading terms stay in English either way — R-multiple, profit factor, drawdown — because that is what the material you read next will use.':
    'Trading terimleri her iki dilde de İngilizce kalır — R-multiple, profit factor, drawdown — çünkü okuyacağın kaynaklar bu terimleri kullanıyor.',
  'Backups': 'Yedekler',
  'The backup file is the only way trades reach another machine':
    'Yedek dosyası, işlemlerin başka bir makineye ulaşmasının tek yolu',
  '{n} trades and their screenshots are stored in this browser only — nothing is sent anywhere. Clearing site data, switching browser or reinstalling loses them, so export regularly.':
    '{n} işlem ve ekran görüntüleri sadece bu tarayıcıda saklanıyor — hiçbir yere gönderilmiyor. Site verisini temizlemek, tarayıcı değiştirmek ya da yeniden kurmak hepsini siler, o yüzden düzenli yedek al.',
  'This browser will not store anything.': 'Bu tarayıcı hiçbir şey saklamayacak.',
  'A page opened straight from disk is blocked from saving in some browsers, so nothing here survives a reload. Serve the folder over http instead: open Terminal, cd into the folder, run {cmd}, then visit localhost:8000.':
    'Bazı tarayıcılar diskten açılan sayfanın kayıt yapmasını engelliyor, o yüzden burada hiçbir şey sayfa yenilenince kalmıyor. Klasörü http üzerinden sun: Terminal\'i aç, klasöre gir, {cmd} çalıştır, sonra localhost:8000 adresini aç.',
  'Last backup': 'Son yedek',
  'Changes since then': 'O günden beri değişiklik',
  'Export backup': 'Yedek al',
  'Import backup': 'Yedek yükle',
  'Export CSV': 'CSV al',
  'Delete every trade': 'Tüm işlemleri sil',
  'Moving to another computer': 'Başka bir bilgisayara geçmek',
  'Export here, import there, pick Replace': 'Burada al, orada yükle, Replace seç',
  'Here: press {btn}. You get one {ext} file holding every trade, your accounts and rules, and every screenshot.':
    'Burada: {btn} düğmesine bas. Tüm işlemlerini, hesap ve kurallarını, her ekran görüntüsünü taşıyan tek bir {ext} dosyası alırsın.',
  'There: open the same page — the hosted link, or {file} from the folder — go to Settings and press {btn}.':
    'Orada: aynı sayfayı aç — yayınlanan link ya da klasördeki {file} — Ayarlar\'a gel ve {btn} düğmesine bas.',
  'Choose Replace everything. The second machine becomes an exact copy: same trades, same ids, same screenshots, same rules.':
    'Replace everything seç. İkinci makine birebir kopya olur: aynı işlemler, aynı id\'ler, aynı ekran görüntüleri, aynı kurallar.',
  'There is no automatic sync. Both machines keep editing their own copy after an import, so treat one as the machine you log on and the other as the one you read on — or re-export after every session. Merge exists for the case where both have trades the other lacks; it matches on trade id, so a trade edited in two places keeps whichever version was imported last.':
    'Otomatik senkron yok. Yüklemeden sonra iki makine de kendi kopyasını düzenlemeye devam eder, o yüzden birini işlem girdiğin makine, diğerini okuduğun makine say — ya da her seanstan sonra yeniden yedek al. Merge, iki tarafta da diğerinde olmayan işlemler varken işe yarar; işlem id\'sine göre eşleştirir, yani iki yerde düzenlenen bir işlem en son yüklenen sürümü korur.',

  /* ---- sample data notes ---- */
  'Sample entry — replace with your own notes.': 'Örnek kayıt — kendi notlarınla değiştir.',
  'Wait for the level, take the retest, one entry only.':
    'Seviyeyi bekle, retest\'te gir, tek giriş.',
  'No plan — this was a reaction.': 'Plan yok — bu bir tepkiydi.',
  'Took this straight after a loss without waiting for the setup.':
    'Kayıptan hemen sonra, setup\'ı beklemeden girdim.',
  'Followed the plan and let the target work.': 'Plana uydum ve hedefin çalışmasına izin verdim.',
  'Gap 3712–3720, sweep low 3696, target 3760.': 'Gap 3712–3720, sweep dibi 3696, hedef 3760.',
  'Higher timeframe was in a clean uptrend, price swept the London low and left an imbalance behind…':
    'Üst zaman dilimi temiz bir yükseliş trendindeydi, fiyat Londra dibini süpürdü ve arkasında bir dengesizlik bıraktı…',
  'One entry at the 50% of the gap, stop under the sweep, target the previous high. No re-entry.':
    'Gap\'in %50\'sinden tek giriş, stop süpürmenin altında, hedef önceki tepe. Tekrar giriş yok.',
  'Entered on the first touch instead of waiting for the close — got a better price but it was luck, not process.':
    'Kapanışı beklemek yerine ilk temasta girdim — daha iyi fiyat aldım ama bu şans, süreç değil.',
  'Comfortable the whole way. Nearly moved the stop up early out of impatience.':
    'Baştan sona rahattım. Sabırsızlıktan stop\'u erken yukarı çekmeye az kalmıştı.',
  'Let the first target run when the trend is this clean.':
    'Trend bu kadar temizken ilk hedefin koşmasına izin ver.',

  /* ---- dialogs and toasts ---- */
  'Delete this trade?': 'Bu işlem silinsin mi?',
  '{sym} on {d}, {pnl}.': '{d} tarihli {sym}, {pnl}.',
  'This cannot be undone.': 'Bu geri alınamaz.',
  'Trade deleted': 'İşlem silindi',
  'Trade updated': 'İşlem güncellendi',
  'Trade logged — {r}': 'İşlem kaydedildi — {r}',
  'Screenshot added': 'Ekran görüntüsü eklendi',
  'Could not read that image': 'Bu görsel okunamadı',
  'This browser would not store the image': 'Bu tarayıcı görseli saklamadı',
  'Review saved': 'İnceleme kaydedildi',
  'Account updated': 'Hesap güncellendi',
  'Rules updated': 'Kurallar güncellendi',
  'Remove this account?': 'Bu hesap kaldırılsın mı?',
  '{n} trades belong to it and will be removed too.': 'Bu hesaba ait {n} işlem de silinecek.',
  'It holds no trades.': 'Hiç işlem içermiyor.',
  'Delete every trade?': 'Tüm işlemler silinsin mi?',
  'All {n} trades and their screenshots will be removed from this browser. Nothing else has a copy — export a backup first if you might want them.':
    'Bu tarayıcıdaki {n} işlemin tamamı ve ekran görüntüleri silinecek. Başka hiçbir yerde kopyası yok — isteyebileceksen önce yedek al.',
  'Delete everything': 'Hepsini sil',
  'All trades deleted': 'Tüm işlemler silindi',
  'Saved {f}': '{f} kaydedildi',
  'Download blocked here — copied to your clipboard instead':
    'Burada indirme engelli — bunun yerine panoya kopyalandı',
  'Could not export from this view': 'Bu ekrandan dışa aktarılamadı',
  'That file could not be read': 'Bu dosya okunamadı',
  'That is not a valid backup — the JSON is malformed': 'Geçerli bir yedek değil — JSON bozuk',
  'That file is not a TradeTracker backup': 'Bu dosya bir TradeTracker yedeği değil',
  'Import this backup?': 'Bu yedek yüklensin mi?',
  '{n} trades and {s} screenshots, exported {d}.':
    '{n} işlem ve {s} ekran görüntüsü, {d} tarihinde alınmış.',
  'at an unknown date': 'bilinmeyen bir tarihte',
  'Replace makes this browser identical to the file — your current {n} trades are removed first. That is what you want on a second machine.':
    'Replace bu tarayıcıyı dosyanın birebir aynısı yapar — mevcut {n} işlemin önce silinir. İkinci bir makinede isteyeceğin şey budur.',
  'Merge keeps what is here and adds the file on top':
    'Merge buradakini korur ve dosyayı üstüne ekler',
  ', overwriting the {n} trades that appear in both': ', iki tarafta da olan {n} işlemin üstüne yazar',
  'Heads up: the checksum does not match, so this file was edited or truncated after it was written. It will still import — check the trade count afterwards.':
    'Dikkat: checksum tutmuyor, yani bu dosya yazıldıktan sonra düzenlenmiş ya da yarım kalmış. Yine de yüklenir — sonrasında işlem sayısını kontrol et.',
  'Merge': 'Merge',
  'Replace everything': 'Hepsini değiştir',
  'Imported {n} trades': '{n} işlem yüklendi',
  'Imported, but this browser refused to save them': 'Yüklendi, ama bu tarayıcı kaydetmeyi reddetti',
  'Browser storage is full — export a backup, then delete some old trades.':
    'Tarayıcı deposu dolu — yedek al, sonra eski işlemlerden bir kısmını sil.',
  'This browser refused to save. Export a backup before you close the page.':
    'Bu tarayıcı kaydetmeyi reddetti. Sayfayı kapatmadan önce yedek al.'
};

/** Translate. The key is the English string, so an untranslated key
 *  renders as English instead of breaking. {named} placeholders are
 *  substituted after lookup, which lets Turkish reorder them. */
function tx(k, p) {
  let s = (LANG === 'tr' && TR[k] !== undefined) ? TR[k] : k;
  if (p) for (const x in p) s = s.split('{' + x + '}').join(p[x]);
  return s;
}

const MON_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MON_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MON_TR_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

function monLong(i) { return LANG === 'tr' ? MON_TR[i] : MON_EN[i]; }
function monShort(i) { return LANG === 'tr' ? MON_TR_SHORT[i] : MON_EN[i].slice(0, 3); }
function dayShort(i) { return LANG === 'tr' ? DAY_TR[i] : DAY_EN[i]; }
/** Calendar column heads. One letter is enough in English; Turkish
 *  needs two, because four weekdays start with P or C. */
function dayInitial(i) { return LANG === 'tr' ? DAY_TR[i].slice(0, 2) : DAY_EN[i][0]; }

/** Static markup carries data-t="key"; this walks it after a change. */
function applyStaticLang() {
  $$('[data-t]').forEach(el => { el.textContent = tx(el.dataset.t); });
  $$('[data-t-title]').forEach(el => { el.title = tx(el.dataset.tTitle); });
  $$('[data-t-ph]').forEach(el => { el.placeholder = tx(el.dataset.tPh); });
  document.documentElement.lang = LANG;
}
</script>
