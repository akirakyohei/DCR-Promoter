from io import StringIO
from flask import Flask, json, render_template,request
from Bio import SeqIO
import os
from flask import send_from_directory

from model import Model_predict
app = Flask(__name__)

model_prom = Model_predict()

@app.route('/')
def main():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                          'img/favicon.ico',mimetype='image/vnd.microsoft.icon')
@app.route('/research',methods=['POST'])
def research():
    file=request.files.get('upload')
    threshold = request.form.get('threshold',type=float)
    print('\x1b[6;30;42m' + 'Success!' + '\x1b[0m')
    print(threshold)
    print('\n')
    str_seqs = StringIO(file.read().decode("utf-8"))
    data_promoter = model_prom.predict_promoters(str_seqs,threshold)
    print(data_promoter)
    response = app.response_class(
    response=json.dumps(data_promoter),
    status=200,
    mimetype='application/json'
    )

    return response


if __name__ == '__main__':
    model_prom.__init__()
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(use_reloader=True)
