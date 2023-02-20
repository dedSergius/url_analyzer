<template>
  <v-container :class="containerClass">
    <v-row>
      <v-col cols="12">
        <v-form ref="form" @submit.prevent="analyzeUrl">
          <v-text-field v-model="url" label="URL" required></v-text-field>
          <v-btn type="submit" color="primary">Analyze</v-btn>
        </v-form>
      </v-col>
    </v-row>
    <v-row v-if="isLoading">
      <v-col cols="12">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </v-col>
    </v-row>
    <v-row v-else-if="page">
      <v-col cols="8">
        <h2>{{ page.title }}</h2>
        <p v-if="page.description">{{ page.description }}</p>
        <p v-else class="text-grey">No description</p>
      </v-col>
      <v-col cols="4">
        <img v-if="page.screenshot" :src="page.screenshot" alt="Screenshot" class="image-preview" @click="showFullImage()">
      </v-col>
      <v-dialog v-model="showFullImageDialog" persistent max-width="90%" class="full-image-dialog">
        <v-card>
          <v-card-title>
            <span class="title">{{ page.title }}</span>
            <v-spacer></v-spacer>
            <v-btn icon @click="showFullImageDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <img :src="page.screenshot" class="full-image" />
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-col cols="12">
        <v-card>
          <v-tabs v-model="tab">
            <v-tab v-for="t in resourceTypes" :key="t" :value="t">{{ t }}</v-tab>
          </v-tabs>
          <v-window v-model="tab">
            <v-window-item v-for="t in resourceTypes" :key="t" :value="t">
              <v-card-text class="resources-list">
                <v-card class="resource-card" v-for="resource in getPageResourcesByType(t)" :key="resource.url">
                  <p><strong>URL: </strong><a :href="resource.url" target="_blank">{{ getPathname(resource.url) }}</a></p>
                  <p><strong>Status: </strong><v-icon :color="getStatusColor(resource.status)">{{ getStatusIcon(resource.status) }}</v-icon> {{ resource.status }}</p>
                  <p><strong>Type: </strong>{{ resource.type }}</p>
                  <p><strong>Mime Type: </strong>{{ resource.mimeType }}</p>
                  <p><strong>Size: </strong>{{ resource.size }}</p>
                  <p><strong>Remote IP Address: </strong>{{ resource.remoteIPAddress }}</p>
                </v-card>
              </v-card-text>
            </v-window-item>
          </v-window>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import axios from 'axios';
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.min.css";
import "alertifyjs/build/css/themes/default.min.css";
export default {
  name: 'HomePage',
  data() {
    return {
      alerts: [],
      tab: null,
      url: '',
      isLoading: false,
      page: null,
      error: null,
      resourceTypes: [],
      resources: [],
      showFullImageDialog: false,
    };
  },
  computed: {
    containerClass() {
      return {
        'home-container': !this.page && !this.isLoading,
        'results-container': this.page,
      }
    }
  },
  methods: {
    async analyzeUrl() {
      if (!this.isValidUrl(this.url)) {
        alertify.error('Invalid URL');
        return;
      }
      if (!this.url.startsWith('http://') && !this.url.startsWith('https://')) {
        this.url = `http://${this.url}`;
      }
      this.isLoading = true;
      try {
        const response = await axios.get(`http://localhost/api/analyze?url=${this.url}`);
        this.page = response.data;
        this.resourceTypes = [...new Set(response.data.resources.map((r) => r.type))];
        this.resources = response.data.resources;
      } catch (error) {
        console.error(error);
        alertify.error('Failed to analyze URL');
      } finally {
        this.isLoading = false;
      }
    },
    isValidUrl(url) {
      const urlPattern = new RegExp(
        "^(https?:\\/\\/)?" + 
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|localhost)" + 
        "(:\\d+)?" + 
        "(\\/[-a-z\\d%@_.~+&:]*)*" + 
        "(\\?[;&a-z\\d%@_.,~+&:=-]*)?" + 
        "(\\#[-a-z\\d_]*)?$",
        "i"
      );
      return !!urlPattern.test(url);
    },
    getPathname(url) {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;

      const fileNameRegex = /\/([^/]+\.[^/]+)$/;
      const fileNameMatch = pathname.match(fileNameRegex);
      if (fileNameMatch) {
        return fileNameMatch[1];
      }

      const maxPathLength = 30;
      let truncatedPath = pathname;
      if (truncatedPath.length > maxPathLength) {
        const pathParts = truncatedPath.split('/');
        if (pathParts.length > 2) {
          truncatedPath = `.../${pathParts.slice(-2).join('/')}`;
        } else {
          truncatedPath = `.../${pathParts[pathParts.length - 1]}`;
        }
      }
      return truncatedPath;
    },
    getPageResourcesByType(type) {
      return this.resources.filter((r) => r.type === type)
    },
    getStatusColor(status) {
      switch (status) {
        case 200:
          return 'green';
        case 300:
          return 'orange';
        case 400:
        case 500:
          return 'red';
        default:
          return 'grey';
      }
    },
    getStatusIcon(status) {
      switch (status) {
        case 200:
          return 'mdi-check';
        case 300:
          return 'mdi-alert';
        case 400:
        case 500:
          return 'mdi-close';
        default:
          return 'mdi-help-circle';
      }
    },
    showFullImage() {
      this.showFullImageDialog = true;
    }
  },
};
</script>
