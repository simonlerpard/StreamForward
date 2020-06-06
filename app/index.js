var http = require('http');
var fs = require('fs');
var qs = require('querystring');
var parser = require('fast-xml-parser');
var he = require('he');
const { execSync } = require("child_process");

const options = {
    attributeNamePrefix : "@_",
    attrNodeName: "attr", //default is 'false'
    textNodeName : "#text",
    ignoreAttributes : true,
    ignoreNameSpace : false,
    allowBooleanAttributes : false,
    parseNodeValue : true,
    parseAttributeValue : false,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",
    parseTrueNumberOnly: false,
    arrayMode: false, //"strict"
    attrValueProcessor: (val, attrName) => he.decode(val, {isAttributeValue: true}),//default is a=>a
    tagValueProcessor : (val, tagName) => he.decode(val), //default is a=>a
    stopNodes: ["parse-me-as-string"]
};

var getHtml = function(table) {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
</head>
<body>
    <form action="/" method="POST">
        <label>IP Address: </label>
        <input type="text" name="ip" id="ip" value="" /><span>Se din ip här: <a href="https://ipinfo.io/ip" target="_blank">Ipinfo</a> <a href="https://ifconfig.co/" target="_blank">Ifconfig</a></span><br />
        <label>Timeout in seconds (max 14400): </label>
        <input type="number" name="timeout" id="timeout" value="10000" max="14400" /><br />
        <button>submit</button>
    </form>
    <br/><br/>
    ${table}
    <script>
        window.onload = function exampleFunction() {
            fetch('https://ipinfo.io/json')
                .then(response => response.json())
                .then(data => document.getElementById('ip').value = data.ip);
        }
    </script>
</body>
</html>
`
}

const backButton = '<br><br><a href="/">Continue</a>';

var server = http.createServer(function (req, res) {

    if (req.method === "GET" && req.url === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        fs.createReadStream("./public/form.html", "UTF-8");
	var table = '';
	try {
	    var xmlData = execSync('ipset list --output xml').toString();
	    if( parser.validate(xmlData) === true) { //optional (it'll return an object in case it's not valid)
                var jsonObj = parser.parse(xmlData,options);
            }

            // Intermediate obj
            var tObj = parser.getTraversalObj(xmlData,options);
            var jsonObj = parser.convertToJson(tObj,options);
            var members = jsonObj.ipsets.ipset.members;
		members = members.member === undefined ? [] : members.member
		members = Array.isArray(members) ? members : [members]
		table = '<table><tr><th>IP Address</th><th>Timeout</th><th>Delete</th></tr>';
	    members.forEach((el) => {
                table += `<tr><td>${el.elem}</td><td>${el.timeout}</td><td><a href="/delete?ip=${el.elem}">Delete</a></td></tr>`
	    })
		table += '</table>'
	    console.log(jsonObj)
	} catch (e) {
		console.log("Failed to fetch XML data from ipset: " + e.toString());
	}
	res.end(getHtml(table));
    } else if (req.method === "POST" && req.url === "/") {
    
        var body = "";
        req.on("data", function (chunk) {
            body += chunk;
        });

        req.on("end", function(){
            res.writeHead(200, { "Content-Type": "text/html" });
	    var POST = qs.parse(body);
	    var ip = POST.ip
	    var timeout = POST.timeout;
	    timeout > 0 ? timeout : 60
	    timeout <= 14400 ? timeout : 14400
            try {
                execSync('ipset add temp_host ' + ip + ' timeout ' + timeout)
		res.end("IP address " + ip + " added to whitelist for " + timeout + " seconds." + backButton);
	    } catch (e) {
                res.end("Failed to update iptables: " + e.toString() + backButton);
	    }
        });
    } else if (req.url === "/delete") {
	res.writeHead(200, {"Content-Type": "text/html"});
        var ip = 'TODO'
        try {
            execSync('ipset del temp_host ' + ip)
            res.end(`IP ${ip} is now removed from the temporary whitelist ${backButton}`);
	} catch(e) {
            res.end("Failed to delete the ip " + ip + ': ' + e.toString() + backButton);
	}
    }

}).listen(3000);
