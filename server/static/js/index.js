$(document).ready(function() {
    $(document).ajaxStart(function() {
        $("#loading").show();
    });
    $(document).ajaxStop(function() {
        $("#loading").hide();
    });
});

var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
})

function validateFasta(fasta) {

    if (!fasta) { // check there is something first of all
        return false;
    }

    // immediately remove trailing spaces
    fasta = fasta.trim();

    // split on newlines... 
    var lines = fasta.split('\n');
    console.log(lines.length);
    if (fasta[0] != '>')
        return false;
    if (lines.length < 2)
        return false;
    if (lines[lines.length - 1][0] == '>')
        return false;

    for (i = 0; i < lines.length; i++)
        if (lines[i][0] == '>')
            continue;
        else {
            const regex = new RegExp('^[CAGTcagt]+$');
            res = regex.test(lines[i])
            if (!res)
                return false;
        }
    return true;
}


function submit_seq() {
    var formData = new FormData()
    is_upload_by_file = $("#upload-file").is(':checked')
    if (is_upload_by_file) {
        input_file = document.getElementById('file-seq');
        if (input_file.files.length < 1) {
            $.iaoAlert({
                msg: "You didn\'t select file! Please select correct file.",
                type: 'error',
                autoHide: true,
                alertTime: '3000',
                fadeTime: '500',
                closeButton: true,
                closeOnClick: true,
                fadeOnHover: true,
                roundedCorner: true

            })
            return;
        } else {
            formData.append('upload', input_file.files[0])
        }
    } else {
        input_seqs = document.getElementById('input-seqs');
        seqs = input_seqs.value;
        is_fasta = validateFasta(seqs);
        if (!is_fasta) {
            $.iaoAlert({
                msg: "Text is empty or malformed (fasta). Correct input required!",
                type: 'error',
                autoHide: true,
                alertTime: '3000',
                fadeTime: '500',
                closeButton: true,
                closeOnClick: true,
                fadeOnHover: true,
                roundedCorner: true

            })
            return
        }
        console.log(seqs)
        var blob = new Blob([seqs], { type: { type: 'fasta' } })
        var fileOfBlob = new File([blob], 'seq.fasta');
        formData.append("upload", fileOfBlob);
    }
    input_threshold = document.getElementById('input-threshold');
    threshold = input_threshold.value;
    formData.append('threshold', threshold)
    $.ajax({
        url: '/research',
        type: 'get',
        data: formData,
        contentType: false,
        processData: false,
        cache: false,
        method: 'POST',
        success: function(res) {
            if (res.length == 0) {
                $('#no-promoter-pannel').show();
                $('#promoter-pannel').hide();
                return;
            }
            $('#no-promoter-pannel').hide();
            $('#promoter-pannel').show();
            $('#download-report').click(function() {
                download(res);
            });
            drawScatter3d(res)
            $('#profile-tab').click()
            setTimeout(function() {
                Plotly.Plots.resize(resP('scatter-promoter'));
            }, 300)
        },
        error: function(res) {
            console.log('error')
        }


    })
}

function clear_input() {
    input_seqs = document.getElementById('input-seqs');
    input_seqs.value = '';
    input_threshold = document.getElementById('input-threshold');
    input_threshold.value = 0.5;
    document.getElementById('file-seq').value = "";
    document.getElementById('upload-file').checked = false;
}

var tabEl = document.querySelector('button[data-bs-toggle="tab"]')
tabEl.addEventListener('show.bs.tab', function(event) {
    event.target.classList.add('active-background')
    event.relatedTarget.classList.remove('active-background')
})

tabEl.addEventListener('hide.bs.tab', function(event) {
    event.target.classList.remove('active-background')
    event.relatedTarget.classList.add('active-background')

})

function drawScatter3d(data) {
    x = []
    y = []
    z = []
    ids = []

    data.forEach(function(element) {
        x.push(element.SNS);
        y.push(element.FNS);
        z.push(element.ACC);
        ids.push(element.id);
    })

    scatterDIV = document.getElementById('scatter-promoter');
    trace = {
        x: x,
        y: y,
        z: z,
        ids: ids,
        type: 'scatter3d',
        mode: 'markers',
        marker: {
            color: z,
            showscale: true,
            cmin: 0,
            cmax: 1,
            opacity: 0.5

        },
    };
    var layout = {
        autosize: true,
        margin: {
            l: 6.5,
            r: 5.0,
            b: 6.5,
            t: 30,
        },
        scene: {
            xaxis: { title: 'start nucleotitde position', rangemode: 'tozero' },
            yaxis: { title: 'finish nucleotide position', rangemode: 'tozero' },
            zaxis: { title: 'Accuracy' },
        },
        colorscale: 'Bluered',
        showscale: true,
    };
    var config = { responsive: true }
    Plotly.newPlot(scatterDIV, [trace], layout, config);
    scatterDIV.on('plotly_hover', function(e) {
        var info = e.points.map(function(d) {
            return data[d.id]
        })
        console.log(info)
        show_info(info)
    })
}

function resP(id) {
    var d3 = Plotly.d3;

    var parent_width = $("#" + id).parent().width()
    var gd3 = d3.select(`div[id=${id}]`)
        .style({
            width: parent_width - 10,
        });
    return gd3.node();
}

function show_info(d) {
    data = d[0]
    console.log(data)
    $('#seq-info').html(data.info);
    $('#start-nucleotide').html(data.SNS);
    $('#finish-nucleotide').html(data.FNS);
    $('#accuracy').html(data.ACC.toFixed(4) * 100 + '%');
    $('#seq-predict').html(data.sequence);
    $('#seq-strength').html(data.strength);
    $('#acc-strength').html(data.strength_score.toFixed(4) * 100 + '%');
}

function download(data) {
    var date_time = new Date();

    var ws = XLSX.utils.json_to_sheet(data);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Promoter')
    XLSX.writeFile(wb, 'Report predict Promoter and it\'s strength ' + date_time.getDate() + '-' + (date_time.getMonth() + 1) + '-' + date_time.getFullYear() + ".xlsx")

}

window.addEventListener('resize', function() {
    console.log('a')
    Plotly.Plots.resize(resP('scatter-promoter'));
})