module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt)

	grunt.initConfig({
		sass: {
			options: {
				sourceMap: true
			},
			main: {
				src: 'example/css/scss/main.scss',
				dest: 'example/css/main.css'
			}
		},
		autoprefixer: {
			options: {
				map: true
			},
			main: {
				src: 'example/css/main.css',
				dest: 'example/css/main.css'
			}
		},
		watch: {
			sass: {
				files: ['example/css/scss/*.scss'],
				tasks: ['sass']
			},
			css: {
				options: {
					spawn: false,
					livereload: true
				},
				files: ['example/css/*.css'],
				tasks: ['autoprefixer']
			},
			reload: {
				options: {
					livereload: true,
				},
				files: ['example/*.html', 'src/**/*.js'],
			}
		},
		concat: {
			main: {
				src: ['src/vendor/sketch.js', 'src/vendor/css-beziers.js', 'src/plugin.js'],
				dest: 'bundled/jquery.cardeffect.js'
			}
		},
		uglify: {
			main: {
				files: {
					'bundled/jquery.cardeffect.min.js': ['bundled/jquery.cardeffect.js']
				}
			}
		}
	})

	grunt.registerTask('build', ['sass', 'autoprefixer'])
	grunt.registerTask('dev', ['build', 'watch'])
	grunt.registerTask('bundle', ['concat', 'uglify'])
	grunt.registerTask('default', ['dev'])
}