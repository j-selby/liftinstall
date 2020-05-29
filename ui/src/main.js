import Vue from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import VueAxios from 'vue-axios'
import VueI18n from 'vue-i18n'
import { stream_ajax as streamAjax } from './helpers'
import Buefy from 'buefy'
import messages from './locales/messages.json'
import 'buefy/dist/buefy.css'

Vue.config.productionTip = false
Vue.use(Buefy)
Vue.use(VueI18n)
Vue.use(VueAxios, axios)

export const i18n = new VueI18n({
  locale: 'en', // set locale
  fallbackLocale: 'en',
  messages // set locale messages
})

// Borrowed from http://tobyho.com/2012/07/27/taking-over-console-log/
function intercept (method) {
  console[method] = function () {
    var message = Array.prototype.slice.apply(arguments).join(' ')
    window.external.invoke(
      JSON.stringify({
        Log: {
          kind: method,
          msg: message
        }
      })
    )
  }
}

// See if we have access to the JSON interface
var hasExternalInterface = false
try {
  window.external.invoke(JSON.stringify({
    Test: {}
  }))
  hasExternalInterface = true
} catch (e) {
  console.warn('Running without JSON interface - unexpected behaviour may occur!')
}

// Overwrite loggers with the logging backend
if (hasExternalInterface) {
  window.onerror = function (msg, url, line) {
    window.external.invoke(
      JSON.stringify({
        Log: {
          kind: 'error',
          msg: msg + ' @ ' + url + ':' + line
        }
      })
    )
  }

  var methods = ['log', 'warn', 'error']
  for (var i = 0; i < methods.length; i++) {
    intercept(methods[i])
  }
}

// Disable F5
function disableShortcuts (e) {
  switch (e.keyCode) {
    case 116: // F5
      e.preventDefault()
      break
  }
}

// Check to see if we need to enable dark mode
axios.get('/api/dark-mode').then(function (resp) {
  if (resp.data === true) {
    document.body.classList.add('has-background-black-ter')
  }
})

window.addEventListener('keydown', disableShortcuts)

axios.get('/api/attrs').then(function (resp) {
  document.getElementById('window-title').innerText =
    i18n.t('app.window_title', { name: resp.data.name })
}).catch(function (err) {
  console.error(err)
})

function selectFileCallback (name) {
  app.install_location = name
}

window.selectFileCallback = selectFileCallback

var app = new Vue({
  i18n: i18n,
  router: router,
  data: {
    attrs: {},
    config: {},
    install_location: '',
    // If the option to pick an install location should be provided
    show_install_location: true,
    metadata: {
      database: [],
      install_path: '',
      preexisting_install: false
    }
  },
  render: function (caller) {
    return caller(App)
  },
  mounted: function () {
    axios.get('/api/attrs').then(function (resp) {
      app.attrs = resp.data
    }).catch(function (err) {
      console.error(err)
    })
  },
  methods: {
    exit: function () {
      axios.get('/api/exit').catch(function (msg) {
        var searchLocation = (app.metadata.install_path && app.metadata.install_path.length > 0) ? app.metadata.install_path
          : i18n.t('error.location_unknown')

        app.$router.replace({
          name: 'showerr',
          params: {
            msg: i18n.t('error.exit_error', {
              name: app.attrs.name,
              path: searchLocation,
              msg: msg
            })
          }
        })
      })
    },
    stream_ajax: streamAjax
  }
}).$mount('#app')

console.log('Vue started')
