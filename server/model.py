from Bio import SeqIO
import numpy as np
import os
from tensorflow.keras import layers
from tensorflow import keras

class Model_predict:
    
    def __init__(self):
        self.max_len_seq =81
        self.one_nu = {
                    'A':[1,0,0,0],
                    'T':[0,1,0,0], 
                    'G':[0,0,1,0],
                    'C':[0,0,0,1]
                    }
        self.model_promoter = self.create_model_promoter()
        self.model_strength = self.create_model_promoter_strength()
        path_model_promoter=os.path.abspath('./dataset/param/promoter/cp.ckpt')
        path_model_strength=os.path.abspath('./dataset/param/strength/cp.ckpt')
        self.model_promoter.load_weights(path_model_promoter)
        # self.model_strength.load_weights(path_model_strength)
        

    def one_hot(self,seq):
        arr =np.array([])
        for nu in seq:  
            arr = np.concatenate((arr, np.array(self.one_nu[nu])), axis=0)
        return arr.reshape(int(len(arr)/4),4)

    def create_model_promoter(self):
      rows,cols = self.max_len_seq,4
      input = layers.Input(shape=(rows,cols))

      tower_1 = layers.Conv1D(80, kernel_size=7, padding='same', activation='relu')(input)
      tower_1 = layers.AveragePooling1D(2, padding='same')(tower_1)
      tower_1 = layers.Dropout(0.3)(tower_1)

      tower_2 = layers.Conv1D(80, kernel_size=5, padding = 'same',activation='relu')(input)
      tower_2 = layers.AveragePooling1D(2, padding='same')(tower_2)
      tower_2 = layers.Dropout(0.3)(tower_2)

      merged = layers.concatenate([tower_1, tower_2], axis=-1)
      merged = layers.Flatten()(merged)
      out = layers.Dense(128, activation='relu')(merged)
      out = layers.Dropout(0.5)(out)
      out = layers.Dense(1, activation='sigmoid')(out)
    
      model = keras.Model(input,out)
      return model

    def create_model_promoter_strength(self):
      rows,cols = self.max_len_seq,4
      input = layers.Input(shape=(rows,cols))

      tower_1 = layers.Conv1D(80, kernel_size=5, padding='same', activation='relu')(input)
      tower_1 = layers.AveragePooling1D(6, padding='same')(tower_1)
      tower_1 = layers.Dropout(0.5)(tower_1)

      tower_2 = layers.Conv1D(80, kernel_size=7, padding = 'same',activation='relu')(input)
      tower_2 = layers.AveragePooling1D(6, padding='same')(tower_2)
      tower_2 = layers.Dropout(0.5)(tower_2)

      tower_3 = layers.Conv1D(80, kernel_size=32, padding = 'same',activation='relu')(input)
      tower_3 = layers.AveragePooling1D(6, padding='same')(tower_3)
      tower_3 = layers.Dropout(0.5)(tower_3)

      merged = layers.concatenate([tower_1, tower_2,tower_3], axis=-1)
      merged = layers.Flatten()(merged)
      out = layers.Dense(128, activation='relu')(merged)
      out = layers.Dropout(0.5)(out)
      out = layers.Dense(64, activation='relu')(out)
      out = layers.Dropout(0.5)(out)
      out = layers.Dense(1, activation='sigmoid')(out)
    
      model = keras.Model(input,out)
      return model

    def predict_promoters(self,file,threshold =0.5):
        data_promoter=[]
        seqs = SeqIO.parse(file, "fasta")
        id = 0
        for seq_record in seqs:
            seq = str(seq_record.seq).upper()
            if(len(seq)<self.max_len_seq):
               continue
            for i in range(0,len(seq)-self.max_len_seq+1):
                temp_s = seq[i:i+self.max_len_seq]
                temp_seq = [self.one_hot(temp_s)]
                temp_seq = np.reshape(temp_seq,(1,self.max_len_seq,4))
                is_promoter = self.model_promoter.predict(temp_seq)
                if(is_promoter >threshold):
                    is_strong = self.model_promoter.predict(temp_seq)
                    strength =''
                    score_strength =0
                    if(is_strong < threshold):
                        strength = 'strong'
                        score_strength =1-is_strong
                    else:
                        strength= 'weak'
                        score_strength =is_strong
                    #  dong goi du lieu
                    promoter_seq ={
                        'id':id,
                        'info': seq_record.id,
                        'SNS' : i,
                        'FNS' :i+81,
                        'ACC' :float(is_promoter[0][0]),
                        'strength':strength,
                        'strength_score': float(score_strength[0][0]),
                        'sequence': temp_s
                            }
                    id = id+1
                    print('\x1b[6;30;42m' + 'Success!' + '\x1b[0m')
                    print(id)
                    data_promoter.append(promoter_seq)
    
        return data_promoter