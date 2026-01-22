import kivy
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.camera import Camera
from kivy.uix.image import Image
from kivy.uix.label import Label
from kivy.uix.textinput import TextInput
from kivy.uix.button import Button
from kivy.uix.screenmanager import ScreenManager, Screen
from kivy.clock import Clock
from kivy.graphics.texture import Texture

import cv2
import qrcode
import numpy as np
from io import BytesIO

# --- 1. スキャン画面 ---
class ScannerScreen(Screen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.layout = BoxLayout(orientation='vertical', padding=20, spacing=20)
        
        # タイトル
        self.layout.add_widget(Label(text="[ QR Code Scanner ]", size_hint_y=None, height=50, font_size='20sp'))

        # カメラ映像表示用のImage
        self.camera_display = Image(allow_stretch=True, keep_ratio=True)
        self.layout.add_widget(self.camera_display)

        # 読み取り結果表示（スキャン完了後のみ大きく表示）
        self.result_input = TextInput(text="", readonly=True, opacity=0, size_hint_y=None, height=0)
        self.layout.add_widget(self.result_input)

        # 再開ボタン（スキャン完了後に表示）
        self.rescan_btn = Button(text="Tap to Scan Again", size_hint_y=None, height=0, opacity=0, on_press=self.start_scan)
        self.layout.add_widget(self.rescan_btn)

        # 下部ボタンエリア
        btn_layout = BoxLayout(size_hint_y=None, height=120, spacing=10)
        self.to_gen_btn = Button(text="Open QR Generator", on_press=self.go_to_generator)
        btn_layout.add_widget(self.to_gen_btn)
        self.layout.add_widget(btn_layout)

        self.add_widget(self.layout)

        # 実際のカメラ（非表示）
        self.camera = Camera(play=True, resolution=(1280, 720))
        self.scanning_active = True
        Clock.schedule_interval(self.update_scanner, 0.1)

    def update_scanner(self, dt):
        if not self.scanning_active:
            return

        texture = self.camera.texture
        if not texture:
            return

        # 映像の取得と変換
        size = texture.size
        pixels = texture.pixels
        frame = np.frombuffer(pixels, np.uint8).reshape(size[1], size[0], 4)

        # 1. 右に90度回転
        frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
        # 2. 左右反転 (鏡像にする)
        frame = cv2.flip(frame, 1)
        
        # 表示用テクスチャの作成
        buffer = frame.tobytes()
        new_size = (frame.shape[1], frame.shape[0])
        new_texture = Texture.create(size=new_size, colorfmt='rgba')
        new_texture.blit_buffer(buffer, colorfmt='rgba', bufferfmt='ubyte')
        new_texture.flip_vertical()
        self.camera_display.texture = new_texture

        # QRコード検出
        gray = cv2.cvtColor(frame, cv2.COLOR_RGBA2GRAY)
        detector = cv2.QRCodeDetector()
        data, bbox, _ = detector.detectAndDecode(gray)

        if data:
            self.show_result(data)

    def show_result(self, data):
        self.scanning_active = False
        # カメラ映像を隠し、結果を表示
        self.camera_display.size_hint_y = 0
        self.camera_display.opacity = 0
        
        self.result_input.text = data
        self.result_input.opacity = 1
        self.result_input.size_hint_y = 0.6 # 結果を大きく表示
        self.result_input.height = 400
        
        self.rescan_btn.opacity = 1
        self.rescan_btn.size_hint_y = None
        self.rescan_btn.height = 100

    def start_scan(self, instance):
        # 状態をリセットしてカメラを再表示
        self.scanning_active = True
        self.camera_display.size_hint_y = 1
        self.camera_display.opacity = 1
        self.result_input.opacity = 0
        self.result_input.size_hint_y = None
        self.result_input.height = 0
        self.rescan_btn.opacity = 0
        self.rescan_btn.height = 0

    def go_to_generator(self, instance):
        self.manager.current = 'generator'

# --- 2. 作成画面 (全面表示) ---
class GeneratorScreen(Screen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        layout = BoxLayout(orientation='vertical', padding=30, spacing=20)
        
        layout.add_widget(Label(text="[ QR Code Generator ]", size_hint_y=None, height=50, font_size='20sp'))
        
        self.input_data = TextInput(text='https://', multiline=False, size_hint_y=None, height=100, font_size='18sp')
        layout.add_widget(self.input_data)

        gen_btn = Button(text="Generate QR Code", size_hint_y=None, height=120, on_press=self.generate_qr)
        layout.add_widget(gen_btn)

        self.qr_display = Image(allow_stretch=True, keep_ratio=True)
        layout.add_widget(self.qr_display)

        back_btn = Button(text="Back to Scanner", size_hint_y=None, height=100, on_press=self.go_back)
        layout.add_widget(back_btn)

        self.add_widget(layout)

    def generate_qr(self, instance):
        data = self.input_data.text
        if data:
            qr = qrcode.QRCode(version=1, box_size=10, border=4)
            qr.add_data(data)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")

            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            from kivy.core.image import Image as CoreImage
            core_img = CoreImage(buffer, ext='png')
            self.qr_display.texture = core_img.texture

    def go_back(self, instance):
        self.manager.current = 'scanner'

# --- 3. アプリ本体 ---
class MyApp(App):
    def build(self):
        sm = ScreenManager()
        sm.add_widget(ScannerScreen(name='scanner'))
        sm.add_widget(GeneratorScreen(name='generator'))
        return sm

if __name__ == '__main__':
    MyApp().run()
