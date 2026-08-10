import re

# 1. Fix MessagesPage.vue
with open("C:/Dev/Vue/EventJoy App/src/pages/MessagesPage.vue", "r", encoding="utf-8") as f:
    msgs = f.read()

msgs = msgs.replace(
    '''<div class="relative">
        <q-icon name="sym_r_search" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size="20px" />
        <input 
          type="text" 
          placeholder="Keresés beszélgetésekben..." 
          class="w-full bg-[#1E293B] border border-slate-700/50 text-white rounded-[16px] py-3.5 pl-12 pr-4 outline-none focus:border-sky-500/50 focus:bg-[#2A3B54] transition-all placeholder:text-slate-500 font-medium text-[14px] shadow-inner"
        />
      </div>''',
    '''<div class="w-full bg-[#1E293B] rounded-[20px] flex items-center px-4 py-1 shadow-inner focus-within:bg-[#2A3B54] transition-all">
        <q-icon name="sym_r_search" class="text-slate-400" size="22px" />
        <q-input 
          v-model="search"
          borderless
          dense
          dark
          placeholder="Keresés beszélgetésekben..." 
          class="w-full text-white px-3 font-medium text-[14px]"
        />
      </div>'''
)

# Remove borders from message cards in MessagesPage.vue
msgs = re.sub(r'\s*border border-slate-800/50', '', msgs)

# Add search ref to setup
if "const search = ref('')" not in msgs:
    msgs = msgs.replace("const router = useRouter()", "import { ref } from 'vue'\nconst router = useRouter()\nconst search = ref('')")

with open("C:/Dev/Vue/EventJoy App/src/pages/MessagesPage.vue", "w", encoding="utf-8") as f:
    f.write(msgs)

# 2. Fix ChatDetailPage.vue
with open("C:/Dev/Vue/EventJoy App/src/pages/ChatDetailPage.vue", "r", encoding="utf-8") as f:
    chat = f.read()

chat = chat.replace(
    '''<div class="flex-1 bg-[#1E293B] rounded-[24px] border border-slate-700/50 flex items-center px-4 py-2 shadow-inner focus-within:border-sky-500/50 focus-within:bg-[#2A3B54] transition-all">
          <input 
            type="text" 
            placeholder="Írj egy üzenetet..." 
            class="w-full bg-transparent text-white outline-none placeholder:text-slate-500 font-medium text-[14px]"
          />
          <q-btn flat round dense icon="sym_r_sentiment_satisfied" color="slate-400" size="14px" class="ml-2 hover:text-white" />
        </div>''',
    '''<div class="flex-1 bg-[#1E293B] rounded-[24px] flex items-center px-4 py-1 shadow-inner focus-within:bg-[#2A3B54] transition-all">
          <q-input 
            v-model="newMessage"
            borderless
            dense
            dark
            autogrow
            placeholder="Írj egy üzenetet..." 
            class="w-full text-white font-medium text-[14px]"
          />
          <q-btn flat round dense icon="sym_r_sentiment_satisfied" color="slate-400" size="14px" class="ml-2 hover:text-white shrink-0" />
        </div>'''
)

# Remove all borders from message bubbles
chat = re.sub(r'\s*border border-slate-800/50', '', chat)
chat = re.sub(r'\s*border border-sky-400/20', '', chat)

# Add break-words to p tags inside bubbles
chat = re.sub(r'<p class="(.*?)"', r'<p class="\1 break-words whitespace-pre-wrap px-1"', chat)

# Add newMessage ref to setup
if "const newMessage = ref('')" not in chat:
    chat = chat.replace("// Chat detail logic", "import { ref } from 'vue'\nconst newMessage = ref('')")

with open("C:/Dev/Vue/EventJoy App/src/pages/ChatDetailPage.vue", "w", encoding="utf-8") as f:
    f.write(chat)

print("Inputs fixed.")
