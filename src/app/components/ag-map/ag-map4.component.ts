import {Component, ElementRef, NgZone, ViewChild} from '@angular/core';
import {Map, Marker} from 'maplibre-gl';
import {DataServices} from "../../services/data.services";
import {DetectDeviceServices} from "../../services/detect-device.services";
import {ActivatedRoute, Router} from "@angular/router";
import {ColorsServices} from "../../services/colors.services";
import {MapLocation} from "../../models/airgradient/map-location";
import {BottomSheetLocationComponent} from "../ui-components/bottom-sheet-location.component";
import {MatBottomSheet} from "@angular/material/bottom-sheet";
import {Location} from "@angular/common";
import {environment} from "../../../environments/environment";
import {UsAQIServices} from "../../services/usAQI.services";
import {HttpClient} from "@angular/common/http";

@Component({
	selector: 'agMap4',
	styles: [`

	  .header {
		padding: 20px;
	  }

	  .headerText {
		font-size: 24px;
	  }

	  .searchBox {
		max-width: 240px;
		width: 100%;
		min-width: 200px;
		margin: 10px 50px;
		z-index: 10000;
	  }


	  #map {
		position: absolute;
		top: 0px;
		bottom: 0;
		width: 100%;
	  }

	  ::ng-deep .mat-bottom-sheet-container {
		min-width: 60vw !important;
	  }

	  .map-wrap {
		position: relative;
		width: 100%;
		height: calc(100vh - 77px); /* calculate height of the screen minus the heading */
	  }

	  .map {
		position: absolute;
		width: 100%;
		height: 100%;
	  }

	`],
	template: `


		<div>


			<div class="map-wrap">
				<div class="map" #map></div>
			</div>


		</div>


	`
})

export class agMap4Component {

	private currentLongitude:number;
	private currentLatitide:number;
	private currentZoom:number;
	private currentOrgId: String = "ag";
	private agLocations: MapLocation[];

	// public selectedLocation: any = [];
	autocompleteLocations: any;

	map: Map | Map;
	 @ViewChild('map')

	private mapContainer!: ElementRef<HTMLElement>;

	constructor(private Activatedroute: ActivatedRoute,
				private dataServices: DataServices,
				private usAqiServices: UsAQIServices,
				private colorServices: ColorsServices,
				public bottomSheet: MatBottomSheet,
				private location: Location,
				private http: HttpClient,
				private ColorService: ColorsServices,
				public detectDevice: DetectDeviceServices) {
	}

	ngAfterViewInit() {

		this.Activatedroute.queryParamMap
			.subscribe(params => {
				console.log("dataServices.loadData 2");
				this.currentZoom = +params.get('zoom') || 1;
				this.currentLatitide = +params.get('lat') || 0;
				this.currentLongitude = +params.get('long') || 0;
				let token = params.get('token');
				this.dataServices.token = token;
				//this.loadDataAG();
				//this.dataServices.loadDataOaq();

			});


	}

	ngOnDestroy() {
		this.map?.remove();
	}

	logData(strx: string) {
		console.log("cns: " + strx)
		return "#ffffff"
	}


	ngOnInit() {
		this.Activatedroute.queryParamMap
			.subscribe(params => {
				console.log("dataServices.loadData 2");
				this.currentZoom = +params.get('zoom') || 1;
				this.currentLatitide = +params.get('lat') || 0;
				this.currentLongitude = +params.get('long') || 0;
				let token = params.get('token');
				if (token != null) {
					this.dataServices.token = token;
					console.log("tkkk: " + this.dataServices.token)
				}


				const initialState = {
					lng: this.currentLongitude,
					lat: this.currentLatitide,
					zoom: this.currentZoom
				};


				this.map = new Map({
					container: this.mapContainer.nativeElement,
					style: `https://api.maptiler.com/maps/streets-v2/style.json?key=vMpY3OLoCEkM7LpZcWdr`,
					center: [initialState.lng, initialState.lat],
					zoom: initialState.zoom
				});

				this.map.once("load", () => {
					console.log("loaded")
					this.map.addSource("locations", {
						type: "vector",
						tiles: [
							"https://staging.openaq.org/v3/locations/tiles/{z}/{x}/{y}.pbf?parameters_id=2&active=true"
						]
					});


					this.map.addLayer({
						id: "locations",
						type: "circle",
						source: "locations",
						"source-layer": "default",
						"paint": {
							"circle-radius": 12,
							"circle-color": ["step",
								['get', 'value'],
								this.ColorService.getPM25Color(10),
								12,
								this.ColorService.getPM25Color(35),
								35.4,
								this.ColorService.getPM25Color(50),
								55.4,
								this.ColorService.getPM25Color(100),
								150.4,
								this.ColorService.getPM25Color(180),
								250.4,
								this.ColorService.getPM25Color(300)
							]
						},
					});


					var that = this

					this.map.on('click', 'locations', function (e) {
						const features = e.target.queryRenderedFeatures(e.point);
						const locationsId = features[0].properties['sensor_nodes_id'];
						console.log(features[0]);

						var loc = new MapLocation()
						loc.apiSource = "oaq";
						loc.pm02 = features[0].properties['value'];
						loc.locationId = locationsId;
						that.dataServices.selectedLocation = loc;
						that.bottomSheet.open(BottomSheetLocationComponent);
					});

					this.map.on('mouseenter', 'locations', () => {
						console.log("ss")
						this.map.getCanvas().style.cursor = 'pointer'
					})

					this.map.on('mouseleave', 'locations', () => {
						console.log("tt")
						this.map.getCanvas().style.cursor = ''
					})

					this.map.on('moveend', function () {
						console.log('Zoom. ' + Math.round(that.map.getZoom()));
						console.log('Lat. ' + Math.round(that.map.getCenter().lat * 1000) / 1000);
						console.log('Long. ' + Math.round(that.map.getCenter().lng * 1000) / 1000);

						let zoom = Math.round(that.map.getZoom());
						let lat = Math.round(that.map.getCenter().lat * 1000) / 1000;
						let long = Math.round(that.map.getCenter().lng * 1000) / 1000
						let org = that.currentOrgId;
						let token = that.dataServices.token
						let queryString = '?zoom=' + zoom + '&lat=' + lat + '&long=' + long + '&org=' + org + '&token=' + token;

						that.location.replaceState("", queryString);
					});

					this.loadDataAG();



				})
			});
	}

		loadDataAG(){
		this.getAGRequest().subscribe((data: MapLocation[]) => {
			this.agLocations = data;
			this.agLocations.forEach( (location) => {
				location.apiSource = 'ag';
				if (location.publicLocationName == null) location.publicLocationName = "Public Name not set on Dashboard"

					console.log("sss: "+location.publicLocationName)
				location.pm02 = Math.round(location.pm02)
				location.pi02 = Math.round(this.usAqiServices.getUSaqi25(location.pm02))
				location.pm02_clr = this.colorServices.getPM25Color(location.pm02)
				if (location.latitude && location.latitude && location.locationName) this.addAQMarker(location);
			});
		});
	}

	getAGRequest() {
		return this.http.get(environment.apiRoot+'/public/api/v1/world/locations/measures/current?token='+this.dataServices.token);
	}

	addAQMarker(location: MapLocation) {
		var that = this
		var el = document.createElement('div');
		el.className = 'marker';
		el.style.width = "20px"
		el.style.height = "20px"
		el.style.backgroundColor = location.pm02_clr;
		el.addEventListener('click', function () {
			var loc = new MapLocation()
						loc.apiSource = "oaq";
						loc.pm02 = location.pm02;
						loc.locationId = location.locationId;
						that.dataServices.selectedLocation = location;
						that.bottomSheet.open(BottomSheetLocationComponent);
			console.log("clicked")
		});

     new Marker(el)
      .setLngLat([location.longitude, location.latitude])
      .addTo(this.map);
	}

}

