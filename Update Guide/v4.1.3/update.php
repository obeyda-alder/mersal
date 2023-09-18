<?php
if (file_exists('assets/init.php')) {
    require 'assets/init.php';
} else {
    die('Please put this file in the home directory !');
}
if (!file_exists('update_langs')) {
    //die('Folder ./update_langs is not uploaded and missing, please upload the update_langs folder.');
}

$versionToUpdate = '4.1.3';
$olderVersion = '4.1.2';

if ($wo['config']['version'] == $versionToUpdate && $wo['config']['filesVersion'] == $wo['config']['version']) {
    die("Your website is already updated to {$versionToUpdate}, nothing to do.");
}
if ($wo['config']['version'] == $versionToUpdate && $wo['config']['filesVersion'] != $wo['config']['version']) {
    die("Your website is database is updated to {$versionToUpdate}, but files are not uploaded, please upload all the files and make sure to use SFTP, all files should be overwritten.");
}
if ($wo['config']['version'] > $olderVersion) {
    die("Please update to {$olderVersion} first version by version, your current version is: " . $wo['config']['version']);
}

ini_set('max_execution_time', 0);
$updated = false;

function deleteDirectory($dir) {
    if (!file_exists($dir)) {
        return true;
    }
    if (!is_dir($dir)) {
        return unlink($dir);
    }
    foreach (scandir($dir) as $item) {
        if ($item == '.' || $item == '..') {
            continue;
        }
        if (!deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) {
            return false;
        }
    }
    return rmdir($dir);
}
function updateLangs($lang) {
    global $sqlConnect;
    if (!file_exists("update_langs/{$lang}.txt")) {
        $filename = "update_langs/unknown.txt";
    } else {
        $filename = "update_langs/{$lang}.txt";
    }
    // Temporary variable, used to store current query
    $templine = '';
    // Read in entire file
    $lines    = file($filename);
    // Loop through each line
    foreach ($lines as $line) {
        // Skip it if it's a comment
        if (substr($line, 0, 2) == '--' || $line == '')
            continue;
        // Add this line to the current segment
        $templine .= $line;
        $query = false;
        // If it has a semicolon at the end, it's the end of the query
        if (substr(trim($line), -1, 1) == ';') {
            // Perform the query
            $templine = str_replace('`{unknown}`', "`{$lang}`", $templine);
            //echo $templine;
            $query    = mysqli_query($sqlConnect, $templine);
            // Reset temp variable to empty
            $templine = '';
        }
    }
}

if (!empty($_GET['updated'])) {
    $updated = true;
}
if (!empty($_POST['query'])) {
    $query = mysqli_query($sqlConnect, base64_decode($_POST['query']));
    if ($query) {
        $data['status'] = 200;
    } else {
        $data['status'] = 400;
        $data['error']  = mysqli_error($sqlConnect);
    }
    header("Content-type: application/json");
    echo json_encode($data);
    exit();
}
if (!empty($_POST['update_langs'])) {
    $data  = array();
    $query = mysqli_query($sqlConnect, "SHOW COLUMNS FROM `Wo_Langs`");


    while ($fetched_data = mysqli_fetch_assoc($query)) {
        $data[] = $fetched_data['Field'];
    }
    unset($data[0]);
    unset($data[1]);
    unset($data[2]);
    $lang_update_queries = array();
    foreach ($data as $key => $value) {
       // updateLangs($value);
    }
    //$deleteFile = deleteDirectory("update_langs");
    $languages_list = array(
        array(
            "name" => "Afrikaans",
            "code" => "af"
        ),
        array(
            "name" => "Albanian - shqip",
            "code" => "sq"
        ),
        array(
            "name" => "Amharic - አማርኛ",
            "code" => "am"
        ),
        array(
            "name" => "Arabic - العربية",
            "code" => "ar"
        ),
        array(
            "name" => "Aragonese - aragonés",
            "code" => "an"
        ),
        array(
            "name" => "Armenian - հայերեն",
            "code" => "hy"
        ),
        array(
            "name" => "Asturian - asturianu",
            "code" => "ast"
        ),
        array(
            "name" => "Azerbaijani - azərbaycan dili",
            "code" => "az"
        ),
        array(
            "name" => "Basque - euskara",
            "code" => "eu"
        ),
        array(
            "name" => "Belarusian - беларуская",
            "code" => "be"
        ),
        array(
            "name" => "Bengali - বাংলা",
            "code" => "bn"
        ),
        array(
            "name" => "Bosnian - bosanski",
            "code" => "bs"
        ),
        array(
            "name" => "Breton - brezhoneg",
            "code" => "br"
        ),
        array(
            "name" => "Bulgarian - български",
            "code" => "bg"
        ),
        array(
            "name" => "Catalan - català",
            "code" => "ca"
        ),
        array(
            "name" => "Central Kurdish - کوردی (دەستنوسی عەرەبی)",
            "code" => "ckb"
        ),
        array(
            "name" => "Chinese - 中文",
            "code" => "zh"
        ),
        array(
            "name" => "Chinese (Hong Kong) - 中文（香港）",
            "code" => "zh-HK"
        ),
        array(
            "name" => "Chinese (Simplified) - 中文（简体）",
            "code" => "zh-CN"
        ),
        array(
            "name" => "Chinese (Traditional) - 中文（繁體）",
            "code" => "zh-TW"
        ),
        array(
            "name" => "Corsican",
            "code" => "co"
        ),
        array(
            "name" => "Croatian - hrvatski",
            "code" => "hr"
        ),
        array(
            "name" => "Czech - čeština",
            "code" => "cs"
        ),
        array(
            "name" => "Danish - dansk",
            "code" => "da"
        ),
        array(
            "name" => "Dutch - Nederlands",
            "code" => "nl"
        ),
        array(
            "name" => "English",
            "code" => "en"
        ),
        array(
            "name" => "English (Australia)",
            "code" => "en-AU"
        ),
        array(
            "name" => "English (Canada)",
            "code" => "en-CA"
        ),
        array(
            "name" => "English (India)",
            "code" => "en-IN"
        ),
        array(
            "name" => "English (New Zealand)",
            "code" => "en-NZ"
        ),
        array(
            "name" => "English (South Africa)",
            "code" => "en-ZA"
        ),
        array(
            "name" => "English (United Kingdom)",
            "code" => "en-GB"
        ),
        array(
            "name" => "English (United States)",
            "code" => "en-US"
        ),
        array(
            "name" => "Esperanto - esperanto",
            "code" => "eo"
        ),
        array(
            "name" => "Estonian - eesti",
            "code" => "et"
        ),
        array(
            "name" => "Faroese - føroyskt",
            "code" => "fo"
        ),
        array(
            "name" => "Filipino",
            "code" => "fil"
        ),
        array(
            "name" => "Finnish - suomi",
            "code" => "fi"
        ),
        array(
            "name" => "French - français",
            "code" => "fr"
        ),
        array(
            "name" => "French (Canada) - français (Canada)",
            "code" => "fr-CA"
        ),
        array(
            "name" => "French (France) - français (France)",
            "code" => "fr-FR"
        ),
        array(
            "name" => "French (Switzerland) - français (Suisse)",
            "code" => "fr-CH"
        ),
        array(
            "name" => "Galician - galego",
            "code" => "gl"
        ),
        array(
            "name" => "Georgian - ქართული",
            "code" => "ka"
        ),
        array(
            "name" => "German - Deutsch",
            "code" => "de"
        ),
        array(
            "name" => "German (Austria) - Deutsch (Österreich)",
            "code" => "de-AT"
        ),
        array(
            "name" => "German (Germany) - Deutsch (Deutschland)",
            "code" => "de-DE"
        ),
        array(
            "name" => "German (Liechtenstein) - Deutsch (Liechtenstein)",
            "code" => "de-LI"
        ),
        array(
            "name" => "German (Switzerland) - Deutsch (Schweiz)",
            "code" => "de-CH"
        ),
        array(
            "name" => "Greek - Ελληνικά",
            "code" => "el"
        ),
        array(
            "name" => "Guarani",
            "code" => "gn"
        ),
        array(
            "name" => "Gujarati - ગુજરાતી",
            "code" => "gu"
        ),
        array(
            "name" => "Hausa",
            "code" => "ha"
        ),
        array(
            "name" => "Hawaiian - ʻŌlelo Hawaiʻi",
            "code" => "haw"
        ),
        array(
            "name" => "Hebrew - עברית",
            "code" => "he"
        ),
        array(
            "name" => "Hindi - हिन्दी",
            "code" => "hi"
        ),
        array(
            "name" => "Hungarian - magyar",
            "code" => "hu"
        ),
        array(
            "name" => "Icelandic - íslenska",
            "code" => "is"
        ),
        array(
            "name" => "Indonesian - Indonesia",
            "code" => "id"
        ),
        array(
            "name" => "Interlingua",
            "code" => "ia"
        ),
        array(
            "name" => "Irish - Gaeilge",
            "code" => "ga"
        ),
        array(
            "name" => "Italian - italiano",
            "code" => "it"
        ),
        array(
            "name" => "Italian (Italy) - italiano (Italia)",
            "code" => "it-IT"
        ),
        array(
            "name" => "Italian (Switzerland) - italiano (Svizzera)",
            "code" => "it-CH"
        ),
        array(
            "name" => "Japanese - 日本語",
            "code" => "ja"
        ),
        array(
            "name" => "Kannada - ಕನ್ನಡ",
            "code" => "kn"
        ),
        array(
            "name" => "Kazakh - қазақ тілі",
            "code" => "kk"
        ),
        array(
            "name" => "Khmer - ខ្មែរ",
            "code" => "km"
        ),
        array(
            "name" => "Korean - 한국어",
            "code" => "ko"
        ),
        array(
            "name" => "Kurdish - Kurdî",
            "code" => "ku"
        ),
        array(
            "name" => "Kyrgyz - кыргызча",
            "code" => "ky"
        ),
        array(
            "name" => "Lao - ລາວ",
            "code" => "lo"
        ),
        array(
            "name" => "Latin",
            "code" => "la"
        ),
        array(
            "name" => "Latvian - latviešu",
            "code" => "lv"
        ),
        array(
            "name" => "Lingala - lingála",
            "code" => "ln"
        ),
        array(
            "name" => "Lithuanian - lietuvių",
            "code" => "lt"
        ),
        array(
            "name" => "Macedonian - македонски",
            "code" => "mk"
        ),
        array(
            "name" => "Malay - Bahasa Melayu",
            "code" => "ms"
        ),
        array(
            "name" => "Malayalam - മലയാളം",
            "code" => "ml"
        ),
        array(
            "name" => "Maltese - Malti",
            "code" => "mt"
        ),
        array(
            "name" => "Marathi - मराठी",
            "code" => "mr"
        ),
        array(
            "name" => "Mongolian - монгол",
            "code" => "mn"
        ),
        array(
            "name" => "Nepali - नेपाली",
            "code" => "ne"
        ),
        array(
            "name" => "Norwegian - norsk",
            "code" => "no"
        ),
        array(
            "name" => "Norwegian Bokmål - norsk bokmål",
            "code" => "nb"
        ),
        array(
            "name" => "Norwegian Nynorsk - nynorsk",
            "code" => "nn"
        ),
        array(
            "name" => "Occitan",
            "code" => "oc"
        ),
        array(
            "name" => "Oriya - ଓଡ଼ିଆ",
            "code" => "or"
        ),
        array(
            "name" => "Oromo - Oromoo",
            "code" => "om"
        ),
        array(
            "name" => "Pashto - پښتو",
            "code" => "ps"
        ),
        array(
            "name" => "Persian - فارسی",
            "code" => "fa"
        ),
        array(
            "name" => "Polish - polski",
            "code" => "pl"
        ),
        array(
            "name" => "Portuguese - português",
            "code" => "pt"
        ),
        array(
            "name" => "Portuguese (Brazil) - português (Brasil)",
            "code" => "pt-BR"
        ),
        array(
            "name" => "Portuguese (Portugal) - português (Portugal)",
            "code" => "pt-PT"
        ),
        array(
            "name" => "Punjabi - ਪੰਜਾਬੀ",
            "code" => "pa"
        ),
        array(
            "name" => "Quechua",
            "code" => "qu"
        ),
        array(
            "name" => "Romanian - română",
            "code" => "ro"
        ),
        array(
            "name" => "Romanian (Moldova) - română (Moldova)",
            "code" => "mo"
        ),
        array(
            "name" => "Romansh - rumantsch",
            "code" => "rm"
        ),
        array(
            "name" => "Russian - русский",
            "code" => "ru"
        ),
        array(
            "name" => "Scottish Gaelic",
            "code" => "gd"
        ),
        array(
            "name" => "Serbian - српски",
            "code" => "sr"
        ),
        array(
            "name" => "Serbo - Croatian",
            "code" => "sh"
        ),
        array(
            "name" => "Shona - chiShona",
            "code" => "sn"
        ),
        array(
            "name" => "Sindhi",
            "code" => "sd"
        ),
        array(
            "name" => "Sinhala - සිංහල",
            "code" => "si"
        ),
        array(
            "name" => "Slovak - slovenčina",
            "code" => "sk"
        ),
        array(
            "name" => "Slovenian - slovenščina",
            "code" => "sl"
        ),
        array(
            "name" => "Somali - Soomaali",
            "code" => "so"
        ),
        array(
            "name" => "Southern Sotho",
            "code" => "st"
        ),
        array(
            "name" => "Spanish - español",
            "code" => "es"
        ),
        array(
            "name" => "Spanish (Argentina) - español (Argentina)",
            "code" => "es-AR"
        ),
        array(
            "name" => "Spanish (Latin America) - español (Latinoamérica)",
            "code" => "es-419"
        ),
        array(
            "name" => "Spanish (Mexico) - español (México)",
            "code" => "es-MX"
        ),
        array(
            "name" => "Spanish (Spain) - español (España)",
            "code" => "es-ES"
        ),
        array(
            "name" => "Spanish (United States) - español (Estados Unidos)",
            "code" => "es-US"
        ),
        array(
            "name" => "Sundanese",
            "code" => "su"
        ),
        array(
            "name" => "Swahili - Kiswahili",
            "code" => "sw"
        ),
        array(
            "name" => "Swedish - svenska",
            "code" => "sv"
        ),
        array(
            "name" => "Tajik - тоҷикӣ",
            "code" => "tg"
        ),
        array(
            "name" => "Tamil - தமிழ்",
            "code" => "ta"
        ),
        array(
            "name" => "Tatar",
            "code" => "tt"
        ),
        array(
            "name" => "Telugu - తెలుగు",
            "code" => "te"
        ),
        array(
            "name" => "Thai - ไทย",
            "code" => "th"
        ),
        array(
            "name" => "Tigrinya - ትግርኛ",
            "code" => "ti"
        ),
        array(
            "name" => "Tongan - lea fakatonga",
            "code" => "to"
        ),
        array(
            "name" => "Turkish - Türkçe",
            "code" => "tr"
        ),
        array(
            "name" => "Turkmen",
            "code" => "tk"
        ),
        array(
            "name" => "Twi",
            "code" => "tw"
        ),
        array(
            "name" => "Ukrainian - українська",
            "code" => "uk"
        ),
        array(
            "name" => "Urdu - اردو",
            "code" => "ur"
        ),
        array(
            "name" => "Uyghur",
            "code" => "ug"
        ),
        array(
            "name" => "Uzbek - o‘zbek",
            "code" => "uz"
        ),
        array(
            "name" => "Vietnamese - Tiếng Việt",
            "code" => "vi"
        ),
        array(
            "name" => "Walloon - wa",
            "code" => "wa"
        ),
        array(
            "name" => "Welsh - Cymraeg",
            "code" => "cy"
        ),
        array(
            "name" => "Western Frisian",
            "code" => "fy"
        ),
        array(
            "name" => "Xhosa",
            "code" => "xh"
        ),
        array(
            "name" => "Yiddish",
            "code" => "yi"
        ),
        array(
            "name" => "Yoruba - Èdè Yorùbá",
            "code" => "yo"
        ),
        array(
            "name" => "Zulu - isiZulu",
            "code" => "zu"
        )
    );
    $a              = array();
    foreach ($languages_list as $key => $value) {
        $pieces = explode("-", $value['name']);
        if (!empty($pieces)) {
            foreach ($pieces as $key2 => $value2) {
                $a[trim(strtolower($value2))] = trim(strtolower($value['code']));
            }
        }
    }
    $db->where('name', 'version')->update(T_CONFIG, ['value' => $versionToUpdate]);
    foreach ($all_langs as $key => $value) {
        if (in_array($value, array_keys($a))) {
            $count = $db->where('lang_name', $value)->getValue(T_LANG_ISO, 'COUNT(*)');
            if ($count > 0) {
                $db->where('lang_name', $value)->update(T_LANG_ISO, array(
                    'iso' => $a[$value]
                ));
            } else {
                $db->insert(T_LANG_ISO, array(
                    'lang_name' => $value,
                    'iso' => $a[$value]
                ));
            }
        }
    }
    $name = md5(microtime()) . '_updated.php';
    rename('update.php', $name);
}
?>
<html>
   <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Updating WoWonder</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
      <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
      <style>
         @import url('https://fonts.googleapis.com/css?family=Roboto:400,500');
         @media print {
            .wo_update_changelog {max-height: none !important; min-height: !important}
            .btn, .hide_print, .setting-well h4 {display:none;}
         }
         * {outline: none !important;}
         body {background: #f3f3f3;font-family: 'Roboto', sans-serif;}
         .light {font-weight: 400;}
         .bold {font-weight: 500;}
         .btn {height: 52px;line-height: 1;font-size: 16px;transition: all 0.3s;border-radius: 2em;font-weight: 500;padding: 0 28px;letter-spacing: .5px;}
         .btn svg {margin-left: 10px;margin-top: -2px;transition: all 0.3s;vertical-align: middle;}
         .btn:hover svg {-webkit-transform: translateX(3px);-moz-transform: translateX(3px);-ms-transform: translateX(3px);-o-transform: translateX(3px);transform: translateX(3px);}
         .btn-main {color: #ffffff;background-color: #a84849;border-color: #a84849;}
         .btn-main:disabled, .btn-main:focus {color: #fff;}
         .btn-main:hover {color: #ffffff;background-color: #c45a5b;border-color: #c45a5b;box-shadow: -2px 2px 14px rgba(168, 72, 73, 0.35);}
         svg {vertical-align: middle;}
         .main {color: #a84849;}
         .wo_update_changelog {
          border: 1px solid #eee;
          padding: 10px !important;
         }
         .content-container {display: -webkit-box; width: 100%;display: -moz-box;display: -ms-flexbox;display: -webkit-flex;display: flex;-webkit-flex-direction: column;flex-direction: column;min-height: 100vh;position: relative;}
         .content-container:before, .content-container:after {-webkit-box-flex: 1;box-flex: 1;-webkit-flex-grow: 1;flex-grow: 1;content: '';display: block;height: 50px;}
         .wo_install_wiz {position: relative;background-color: white;box-shadow: 0 1px 15px 2px rgba(0, 0, 0, 0.1);border-radius: 10px;padding: 20px 30px;border-top: 1px solid rgba(0, 0, 0, 0.04);}
         .wo_install_wiz h2 {margin-top: 10px;margin-bottom: 30px;display: flex;align-items: center;}
         .wo_install_wiz h2 span {margin-left: auto;font-size: 15px;}
         .wo_update_changelog {padding:0;list-style-type: none;margin-bottom: 15px;max-height: 440px;overflow-y: auto; min-height: 440px;}
         .wo_update_changelog li {margin-bottom:7px; max-height: 20px; overflow: hidden;}
         .wo_update_changelog li span {padding: 2px 7px;font-size: 12px;margin-right: 4px;border-radius: 2px;}
         .wo_update_changelog li span.added {background-color: #4CAF50;color: white;}
         .wo_update_changelog li span.changed {background-color: #e62117;color: white;}
         .wo_update_changelog li span.improved {background-color: #9C27B0;color: white;}
         .wo_update_changelog li span.compressed {background-color: #795548;color: white;}
         .wo_update_changelog li span.fixed {background-color: #2196F3;color: white;}
         input.form-control {background-color: #f4f4f4;border: 0;border-radius: 2em;height: 40px;padding: 3px 14px;color: #383838;transition: all 0.2s;}
input.form-control:hover {background-color: #e9e9e9;}
input.form-control:focus {background: #fff;box-shadow: 0 0 0 1.5px #a84849;}
         .empty_state {margin-top: 80px;margin-bottom: 80px;font-weight: 500;color: #6d6d6d;display: block;text-align: center;}
         .checkmark__circle {stroke-dasharray: 166;stroke-dashoffset: 166;stroke-width: 2;stroke-miterlimit: 10;stroke: #7ac142;fill: none;animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;}
         .checkmark {width: 80px;height: 80px; border-radius: 50%;display: block;stroke-width: 3;stroke: #fff;stroke-miterlimit: 10;margin: 100px auto 50px;box-shadow: inset 0px 0px 0px #7ac142;animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;}
         .checkmark__check {transform-origin: 50% 50%;stroke-dasharray: 48;stroke-dashoffset: 48;animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;}
         @keyframes stroke { 100% {stroke-dashoffset: 0;}}
         @keyframes scale {0%, 100% {transform: none;}  50% {transform: scale3d(1.1, 1.1, 1); }}
         @keyframes fill { 100% {box-shadow: inset 0px 0px 0px 54px #7ac142; }}
      </style>
   </head>
   <body>
      <div class="content-container container">
         <div class="row">
            <div class="col-md-1"></div>
            <div class="col-md-10">
               <div class="wo_install_wiz">
                 <?php if ($updated == false) { ?>
                  <div>
                     <h2 class="light">Update to v<?php echo $versionToUpdate;?></span></h2>
                     <div class="setting-well">
                        <h4>Changelog</h4>
                        <ul class="wo_update_changelog">
                              <li> [Fixed] funding page design was broken.</li>
                              <li> [Fixed] sending a not supported file in chat won't show the wrong file format pop up.</li>
                              <li> [Fixed] when you send a file or an image in chat, clicking on the image doesn't open it.</li>
                              <li> [Fixed] "now ago" showing on notifications.</li>
                              <li> [Fixed] files are not being deleted from third party storage after deleting the post. </li>
                              <li> [Fixed] article link will not open if there an extra slash at the end.</li>
                              <li> [Fixed] 4+ more minor bugs.</li>
                        </ul>
                        <p class="hide_print">Note: The update process might take few minutes.</p>
                        <p class="hide_print">Important: If you got any fail queries, please copy them, open a support ticket and send us the details.</p>
                        <p class="hide_print">Most of the features are disabled by default, you can enable them from Admin -> Manage Features -> Enable / Disable Features, reaction can be enabled from Settings > Posts Sttings.</p><br>
                        <p class="hide_print">Please enter your valid purchase code:</p>
                        <input type="text" id="input_code" class="form-control" placeholder="Your Envato purchase code" style="padding: 10px; width: 50%;"><br>

                        <br>
                             <button class="pull-right btn btn-default" onclick="window.print();">Share Log</button>
                             <button type="button" class="btn btn-main" id="button-update" disabled>
                             Update
                             <svg viewBox="0 0 19 14" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                                <path fill="currentColor" d="M18.6 6.9v-.5l-6-6c-.3-.3-.9-.3-1.2 0-.3.3-.3.9 0 1.2l5 5H1c-.5 0-.9.4-.9.9s.4.8.9.8h14.4l-4 4.1c-.3.3-.3.9 0 1.2.2.2.4.2.6.2.2 0 .4-.1.6-.2l5.2-5.2h.2c.5 0 .8-.4.8-.8 0-.3 0-.5-.2-.7z"></path>
                             </svg>
                          </button>
                     </div>
                     <?php }?>
                     <?php if ($updated == true) { ?>
                      <div>
                        <div class="empty_state">
                           <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                              <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                              <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                           </svg>
                           <p>Congratulations, you have successfully updated your site. Thanks for choosing WoWonder.</p>
                           <br>
                           <a href="<?php echo $wo['config']['site_url'] ?>" class="btn btn-main" style="line-height:50px;">Home</a>
                        </div>
                     </div>
                     <?php }?>
                  </div>
               </div>
            </div>
            <div class="col-md-1"></div>
         </div>
      </div>
   </body>
</html>
<script>
var queries = [
    "UPDATE Wo_Config SET value = 'updating..' WHERE name = 'update_status';"
];

$('#input_code').bind("paste keyup input propertychange", function(e) {
    if (isPurchaseCode($(this).val())) {
        $('#button-update').removeAttr('disabled');
    } else {
        $('#button-update').attr('disabled', 'true');
    }
});

function isPurchaseCode(str) {
    var patt = new RegExp("(.*)-(.*)-(.*)-(.*)-(.*)");
    var res = patt.test(str);
    if (res) {
        return true;
    }
    return true;
}

$(document).on('click', '#button-update', function(event) {
    if ($('body').attr('data-update') == 'true') {
        window.location.href = '<?php echo $wo['config']['site_url']?>';
        return false;
    }
    $(this).attr('disabled', true);
    var PurchaseCode = $('#input_code').val();
    $.post('?check', {code: PurchaseCode}, function(data, textStatus, xhr) {
        if (data.status != 200) {
            $('.wo_update_changelog').html('');
            $('.wo_update_changelog').css({
                background: '#1e2321',
                color: '#fff'
            });
            $('.setting-well h4').text('Updating..');
            $(this).attr('disabled', true);
            RunQuery();
        } else {
            $(this).removeAttr('disabled');
            alert(data.error);
        }
    });
});

var queriesLength = queries.length;
var query = queries[0];
var count = 0;
function b64EncodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
}
function RunQuery() {
    var query = queries[count];
    $.post('?update', {
        query: b64EncodeUnicode(query)
    }, function(data, textStatus, xhr) {
        if (data.status == 200) {
            $('.wo_update_changelog').append('<li><span class="added">SUCCESS</span> ~$ mysql > ' + query + '</li>');
        } else {
            $('.wo_update_changelog').append('<li><span class="changed">FAILED</span> ~$ mysql > ' + query + '</li>');
        }
        count = count + 1;
        if (queriesLength > count) {
            setTimeout(function() {
                RunQuery();
            }, 1500);
        } else {
            $('.wo_update_changelog').append('<li><span class="added">Updating & Adding Langauges</span> ~$ languages.sh, Please wait, this might take some time..</li>');
            $.post('?run_lang', {
                update_langs: 'true'
            }, function(data, textStatus, xhr) {
              $('.wo_update_changelog').append('<li><span class="fixed">Finished!</span> ~$ Congratulations! you have successfully updated your site. Thanks for choosing WoWonder.</li>');
              $('.setting-well h4').text('Update Log');
              $('#button-update').html('Home <svg viewBox="0 0 19 14" xmlns="http://www.w3.org/2000/svg" width="18" height="18"> <path fill="currentColor" d="M18.6 6.9v-.5l-6-6c-.3-.3-.9-.3-1.2 0-.3.3-.3.9 0 1.2l5 5H1c-.5 0-.9.4-.9.9s.4.8.9.8h14.4l-4 4.1c-.3.3-.3.9 0 1.2.2.2.4.2.6.2.2 0 .4-.1.6-.2l5.2-5.2h.2c.5 0 .8-.4.8-.8 0-.3 0-.5-.2-.7z"></path> </svg>');
              $('#button-update').attr('disabled', false);
              $(".wo_update_changelog").scrollTop($(".wo_update_changelog")[0].scrollHeight);
              $('body').attr('data-update', 'true');
            });
        }
        $(".wo_update_changelog").scrollTop($(".wo_update_changelog")[0].scrollHeight);
    });
}
</script>
