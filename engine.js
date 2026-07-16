var digitHistory = [];
var fullPriceHistory = [];
var socket = null;
var appID = "36544"; 

var marketSelect = document.getElementById('market-select');
var strategySelect = document.getElementById('strategy-select');
var marketLabel = document.getElementById('display-market-name');
var priceEl = document.getElementById('live-price');
var digitEl = document.getElementById('last-digit');
var alertStatus = document.getElementById('alert-status-text');
var statusBadge = document.getElementById('status-badge');
var val1 = document.getElementById('val-stat-1');
var val2 = document.getElementById('val-stat-2');

function startLiveConnection() {
    if (socket) { socket.close(); }
    digitHistory = [];
    fullPriceHistory = [];
    
    statusBadge.innerText = "CONNECTING...";
    statusBadge.style.backgroundColor = "#fbbf24";
    statusBadge.style.color = "#0b0f19";
    alertStatus.innerText = "Connecting to Deriv data stream...";
    alertStatus.style.color = "#fbbf24";

    socket = new WebSocket("wss://://binaryws.com" + appID);

    socket.onopen = function() {
        statusBadge.innerText = "BDOLLAR PRO";
        statusBadge.style.backgroundColor = "#22d3ee";
        statusBadge.style.color = "#0b0f19";
        alertStatus.innerText = "Streaming live market data...";
        alertStatus.style.color = "#34d399";
        socket.send(JSON.stringify({ ticks: marketSelect.value }));
    };

    socket.onmessage = function(msg) {
        var response = JSON.parse(msg.data);
        if (response.tick) {
            var rawPrice = response.tick.quote;
            var precision = response.tick.pip_size || 2;
            var priceString = rawPrice.toFixed(precision);
            
            priceEl.innerText = priceString;
            fullPriceHistory.push(rawPrice);
            if(fullPriceHistory.length > 100) fullPriceHistory.shift();
            
            var lastDigit = parseInt(priceString.charAt(priceString.length - 1));
            if (!isNaN(lastDigit)) {
                digitHistory.push(lastDigit);
                if (digitHistory.length > 100) digitHistory.shift();
                updateStats(lastDigit);
            }
        }
    };

    socket.onclose = function() {
        statusBadge.innerText = "OFFLINE";
        statusBadge.style.backgroundColor = "#ef4444";
        statusBadge.style.color = "white";
        setTimeout(startLiveConnection, 5000);
    };
}

function updateStats(digit) {
    var mode = strategySelect.value;
    var counts = Array(10).fill(0);
    var evens = 0, overs = 0, matches = 0;
    
    digitHistory.forEach(function(num) {
        counts[num]++;
        if (num % 2 === 0) evens++;
        if (num >= 5) overs++;
        if (num === 0) matches++;
    });

    if (mode === "even_odd") {
        digitEl.innerText = digit;
        var pct = Math.round((evens / digitHistory.length) * 100) || 0;
        val1.innerText = pct + "%"; val2.innerText = (100 - pct) + "%";
    } else if (mode === "over_under") {
        digitEl.innerText = digit;
        var pct = Math.round((overs / digitHistory.length) * 100) || 0;
        val1.innerText = pct + "%"; val2.innerText = (100 - pct) + "%";
    } else if (mode === "matches_differs") {
        digitEl.innerText = (digit === 0 ? "MATCH" : "DIFFER");
        var pct = Math.round((matches / digitHistory.length) * 100) || 0;
        val1.innerText = pct + "%"; val2.innerText = (100 - pct) + "%";
    } else if (mode === "rise_fall") {
        if(fullPriceHistory.length < 2) return;
        var isRise = fullPriceHistory[fullPriceHistory.length - 1] >= fullPriceHistory[fullPriceHistory.length - 2];
        digitEl.innerText = isRise ? "RISE ▲" : "FALL ▼";
        var rCount = 0;
        for(var i = 1; i < fullPriceHistory.length; i++) {
            if(fullPriceHistory[i] >= fullPriceHistory[i-1]) rCount++;
        }
        var pct = Math.round((rCount / (fullPriceHistory.length - 1)) * 100) || 0;
        val1.innerText = pct + "%"; val2.innerText = (100 - pct) + "%";
    }

    var max = Math.max.apply(null, counts) || 1;
    for (var j = 0; j <= 9; j++) {
        document.getElementById('bar-' + j).style.height = ((counts[j] / max) * 85) + "%";
    }
}

marketSelect.onchange = startLiveConnection;
strategySelect.onchange = function() {
    digitHistory = [];
    var mode = strategySelect.value;
    var lbl1 = document.getElementById('label-stat-1');
    var lbl2 = document.getElementById('label-stat-2');
    var metric = document.getElementById('display-metric-label');
    var chartTitle = document.getElementById('chart-dynamic-title');

    if (mode === "even_odd") {
        metric.innerText = "LAST DIGIT"; lbl1.innerText = "EVEN"; lbl2.innerText = "ODD";
        chartTitle.innerText = "Digit Frequency Distribution (Last 100 Ticks)";
    } else if (mode === "over_under") {
        metric.innerText = "LAST DIGIT"; lbl1.innerText = "OVER (5-9)"; lbl2.innerText = "UNDER (0-4)";
        chartTitle.innerText = "Digit Frequency Distribution (Last 100 Ticks)";
    } else if (mode === "matches_differs") {
        metric.innerText = "TARGET BREAKOUT"; lbl1.innerText = "MATCHES (0)"; lbl2.innerText = "DIFFERS (NON-0)";
        chartTitle.innerText = "Pattern History Matrix";
    } else if (mode === "rise_fall") {
        metric.innerText = "TREND DIRECTION"; lbl1.innerText = "RISE (BULL)"; lbl2.innerText = "FALL (BEAR)";
        chartTitle.innerText = "Tick Retracement Velocity Meter";
    }
    startLiveConnection();
};

marketLabel.innerText = "Market: " + marketSelect.options[marketSelect.selectedIndex].text;
startLiveConnection();
