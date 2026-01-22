import tkinter as tk
from tkinter import messagebox
import qrcode
import cv2
import os
from PIL import Image, ImageTk

class QRApp:
    def __init__(self, root):
        self.root = root
        self.root.title("QRスキャナーPro")
        self.root.geometry("500x900")

        self.cap = None
        self.scanning = False

        # --- UIレイアウト ---
        tk.Label(root, text="QRコード作成 & スキャン", font=("Arial", 16, "bold")).pack(pady=5)

        # 1. 入力・作成エリア
        input_frame = tk.Frame(root)
        input_frame.pack(pady=5, fill=tk.X, padx=20)
        tk.Label(input_frame, text="テキスト:").pack(side=tk.LEFT)
        self.entry = tk.Entry(input_frame)
        self.entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        self.entry.insert(0, "https://www.google.com")

        # 修正ポイント: ボタンフレームをselfに保存してどこからでも参照可能に
        self.btn_frame = tk.Frame(root)
        self.btn_frame.pack(pady=5)
        
        tk.Button(self.btn_frame, text="QR作成", command=self.generate_qr, bg="lightblue", width=10).pack(side=tk.LEFT, padx=5)
        self.btn_scan = tk.Button(self.btn_frame, text="カメラ起動", command=self.toggle_scan, bg="orange", width=10)
        self.btn_scan.pack(side=tk.LEFT, padx=5)

        # 2. 表示エリア
        self.display_label = tk.Label(root, text="[ ここに表示されます ]", bg="black", fg="white", relief=tk.SOLID, bd=1)
        # 最初は非表示ではなく、場所を確保しておく
        self.display_label.pack(pady=10, padx=10, fill=tk.BOTH, expand=True)

        # 3. 読み取り結果・コピーボタンエリア (常に最下部に固定)
        self.result_container = tk.Frame(root)
        self.result_container.pack(side=tk.BOTTOM, fill=tk.X, padx=20, pady=10)

        tk.Label(self.result_container, text="読み取り結果:", font=("Arial", 10, "bold")).pack()
        self.result_var = tk.StringVar(value="未読込")
        self.result_label = tk.Label(self.result_container, textvariable=self.result_var, wraplength=450, 
                                     font=("Arial", 11), fg="blue", bg="#eeeeee", height=4, relief=tk.RIDGE)
        self.result_label.pack(pady=5, fill=tk.X)

        self.btn_copy = tk.Button(self.result_container, text="URLをコピー", command=self.copy_to_clipboard, 
                                 bg="#4CAF50", fg="white", font=("Arial", 11, "bold"), height=2)
        self.btn_copy.pack(pady=5, fill=tk.X)

        
        # (これまでのコードの __init__ の最後に追加)
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        # 起動して0.5秒後にカメラを自動起動
        self.root.after(10, self.start_scan)


    def copy_to_clipboard(self):
        text = self.result_var.get()
        if text == "未読込" or not text: return
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
        messagebox.showinfo("完了", "クリップボードにコピーしました")

    def generate_qr(self):
        """QRコードを作成して表示する"""
        self.stop_scan()
        text = self.entry.get()
        if not text:
            messagebox.showwarning("警告", "テキストを入力してください")
            return
        
        try:
            # QRコード生成
            qr = qrcode.make(text)
            temp_path = os.path.join(os.getcwd(), "temp_qr.png")
            qr.save(temp_path)
            
            # 映像エリアが非表示（pack_forget）状態なら再表示する
            if not self.display_label.winfo_ismapped():
                self.display_label.pack(pady=10, padx=10, fill=tk.BOTH, expand=True, after=self.btn_frame)

            # 画像の読み込みと表示
            img = Image.open(temp_path)
            img.thumbnail((450, 450)) # 適切なサイズに調整
            display_img = ImageTk.PhotoImage(img)
            
            self.display_label.config(image=display_img, text="")
            self.display_label.image = display_img # 参照を保持
            
            self.result_var.set("QR作成完了")
        except Exception as e:
            messagebox.showerror("エラー", f"QR作成中にエラーが発生しました:\n{e}")

    def toggle_scan(self):
        if not self.scanning: self.start_scan()
        else: self.stop_scan()

    def start_scan(self):
        self.cap = cv2.VideoCapture(0)
        if not self.cap.isOpened():
            messagebox.showerror("エラー", "カメラを起動できません")
            return
        
        # エリアを再表示
        if not self.display_label.winfo_ismapped():
            self.display_label.pack(pady=10, padx=10, fill=tk.BOTH, expand=True, after=self.btn_frame)
            
        self.result_var.set("スキャン中...")
        self.scanning = True
        self.btn_scan.config(text="停止", bg="red")
        self.detector = cv2.QRCodeDetector()
        self.update_frame()

    def stop_scan(self):
        self.scanning = False
        if self.cap:
            self.cap.release()
            self.cap = None
        self.btn_scan.config(text="カメラ起動", bg="orange")

    def update_frame(self):
        if self.scanning:
            ret, frame = self.cap.read()
            if ret:
                data, _, _ = self.detector.detectAndDecode(frame)
                if data:
                    self.result_var.set(data)
                    self.stop_scan()
                    # 読み取り成功時に映像エリアを隠す
                    self.display_label.pack_forget() 
                    return

                # プレビュー表示
                lbl_w = self.display_label.winfo_width()
                lbl_h = self.display_label.winfo_height()
                if lbl_w < 10: lbl_w, lbl_h = 480, 400

                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(frame).resize((lbl_w, lbl_h), Image.Resampling.LANCZOS)
                img_tk = ImageTk.PhotoImage(image=img)
                self.display_label.config(image=img_tk, text="")
                self.display_label.image = img_tk
            
            self.root.after(20, self.update_frame)

    def on_closing(self):
        self.stop_scan()
        self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = QRApp(root)
    root.mainloop()
